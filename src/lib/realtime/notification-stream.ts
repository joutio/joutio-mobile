import { subscribeStomp } from '../ws'
import { recordServerInstant } from './server-clock'

/** Enveloppe d'un événement d'agrégat, identique en REST (historique) et en STOMP (`EventEnvelopeResponse` du BFF). */
export interface EventEnvelopeResponse<T> {
  aggregateId: string
  sequenceNumber: number
  timestamp: string
  eventType: string
  payload: T
}

export interface NotificationStreamOptions<T, S> {
  aggregateId: string
  topic: string
  initial: (aggregateId: string) => S
  load: (aggregateId: string) => Promise<EventEnvelopeResponse<T>[]>
  apply: (state: S, payload: T) => S
  /**
   * Trame live (WebSocket) reçue hors replay d'historique : permet de ré-ancrer l'horloge
   * serveur sur chaque événement sans dépendre du seul `GET /api/clock`.
   */
  onLive?: (envelope: EventEnvelopeResponse<T>, receivedAt: number) => void
  /**
   * Tolère un `404` au **premier chargement** pendant cette fenêtre (projection Axon de l'agrégat
   * encore en retard, ex. partie fraîchement créée) : l'historique est rejoué au lieu de déclarer
   * l'agrégat absent. `0`/absent = 404 définitif immédiat.
   */
  notFoundGraceMs?: number
  /** Délai entre deux tentatives pendant la fenêtre `404` (défaut 500 ms). */
  notFoundRetryDelayMs?: number
}

/** Statut observable du stream (chargement, retry transitoire, erreur terminale). */
export interface NotificationStreamStatus {
  loaded: boolean
  /** Un chargement transitoire a échoué : une nouvelle tentative est planifiée. */
  retrying: boolean
  /** Erreur définitive (ex. 404) : l'agrégat n'existe pas / plus. */
  terminalError: boolean
  /** Un trou de séquence a été détecté : un rechargement d'historique est en cours/planifié. */
  lagging: boolean
}

const RETRY_BASE_MS = 1_000
const RETRY_MAX_MS = 8_000

/** Délai laissé à une trame manquante pour arriver avant de rejouer l'historique. */
const GAP_GRACE_MS = 400

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Valide le contrat d'enveloppe avant tout fold (ignore les trames malformées). */
function isEnvelope(value: unknown): value is EventEnvelopeResponse<unknown> {
  if (!isRecord(value)) return false
  const payload = value.payload
  return typeof value.aggregateId === 'string' && typeof value.sequenceNumber === 'number' && isRecord(payload) && typeof payload.type === 'string'
}

/**
 * Une erreur 4xx (hors timeout 408) est définitive : pas de retry, l'agrégat est inaccessible.
 * Les erreurs réseau/timeout/5xx sont transitoires et déclenchent un backoff.
 */
function isTerminalError(error: unknown): boolean {
  const status = (error as { statusCode?: number } | undefined)?.statusCode
  return status != null && status >= 400 && status < 500 && status !== 408
}

/**
 * Flux de notifications idempotent (port de `joutio-web/src/shared/realtime/notification-stream.ts`) :
 * bootstrap par l'historique REST, puis entretien **uniquement** par abonnement STOMP (aucun polling). La déduplication s'appuie sur `sequenceNumber` (REST + WS partagent le même
 * enveloppe). À chaque (re)connexion WS, l'historique est rejoué pour fermer la fenêtre
 * REST ↔ WS.
 *
 * <p>Robustesse : les trames arrivées dans le désordre sont bufferisées et appliquées dans
 * l'ordre ; un trou de séquence déclenche un rechargement REST debouncé ; un rechargement
 * demandé pendant qu'un autre est en vol est rejoué à la fin au lieu d'être abandonné — plus
 * aucune trame de phase ne peut être perdue silencieusement.</p>
 */
export class NotificationStream<T, S> {
  private readonly options: NotificationStreamOptions<T, S>
  private state: S
  private lastSequence = -1
  private loading = false
  private started = false
  private pending: EventEnvelopeResponse<T>[] = []
  /** Trames live reçues hors ordre (trou de séquence) en attente de leur prédécesseur. */
  private buffered = new Map<number, EventEnvelopeResponse<T>>()
  private gapTimer?: ReturnType<typeof setTimeout>
  private reloadQueued = false
  private unsubscribe?: () => void
  private retryTimer?: ReturnType<typeof setTimeout>
  private retryAttempt = 0
  /** Début du cycle courant : borne la fenêtre de tolérance au 404 initial. */
  private startedAt = 0
  private status: NotificationStreamStatus = {
    loaded: false,
    retrying: false,
    terminalError: false,
    lagging: false,
  }
  private readonly listeners = new Set<() => void>()

  constructor(options: NotificationStreamOptions<T, S>) {
    this.options = options
    this.state = options.initial(options.aggregateId)
  }

  getSnapshot = (): S => this.state

  getStatus = (): NotificationStreamStatus => this.status

  isLoaded = (): boolean => this.status.loaded

  hasLoadError = (): boolean => this.status.terminalError

  isRetrying = (): boolean => this.status.retrying

  isLagging = (): boolean => this.status.lagging

  /** Rejoue l'historique REST (filet de rattrapage quand une trame WS est manquée). */
  refresh = (): void => {
    this.requestReload()
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  start(): void {
    if (this.started) return
    this.started = true
    this.startedAt = Date.now()
    // Abonnement AVANT le fetch : les notifications WS reçues pendant le chargement de
    // l'historique sont bufferisées puis fusionnées (dédup par séquence).
    this.unsubscribe = subscribeStomp(
      this.options.topic,
      (message) => this.onMessage(message.body),
      () => this.requestReload(),
    )
    // Si la connexion partagée est déjà établie, `subscribeStomp` a déclenché le chargement
    // ci-dessus (ordre synchrone) : on évite un second GET redondant.
    if (!this.loading) {
      this.requestReload()
    }
  }

  stop(): void {
    this.started = false
    this.clearRetryTimer()
    this.clearGapTimer()
    this.buffered.clear()
    this.retryAttempt = 0
    if (this.status.retrying || this.status.lagging) {
      this.setStatus({ retrying: false, lagging: false })
    }
    this.unsubscribe?.()
    this.unsubscribe = undefined
  }

  /** Recharge l'historique ; si un chargement est déjà en vol, on le rejouera à la fin. */
  private requestReload(): void {
    if (this.loading) {
      this.reloadQueued = true
      return
    }
    void this.reload()
  }

  private async reload(): Promise<void> {
    if (this.loading) {
      this.reloadQueued = true
      return
    }
    this.loading = true
    this.pending = []
    this.clearGapTimer()
    try {
      const loaded = await this.options.load(this.options.aggregateId)
      const envelopes = Array.isArray(loaded) ? loaded : []
      this.reset()
      for (const envelope of envelopes) {
        if (isEnvelope(envelope)) {
          this.applyEnvelope(envelope as EventEnvelopeResponse<T>)
        }
      }
      // Fusionne les trames live arrivées pendant le chargement (ou bufferisées sur un trou)
      // en respectant strictement l'ordre des séquences.
      const merge = [...this.pending, ...this.buffered.values()]
        .filter((envelope) => envelope.sequenceNumber > this.lastSequence)
        .sort((a, b) => a.sequenceNumber - b.sequenceNumber)
      this.pending = []
      this.buffered.clear()
      for (const envelope of merge) {
        if (envelope.sequenceNumber <= this.lastSequence) continue
        if (envelope.sequenceNumber === this.lastSequence + 1) {
          this.applyEnvelope(envelope)
        } else {
          this.buffered.set(envelope.sequenceNumber, envelope)
        }
      }
      this.retryAttempt = 0
      this.clearRetryTimer()
      this.setStatus({
        loaded: true,
        retrying: false,
        terminalError: false,
        lagging: this.buffered.size > 0,
      })
      if (this.buffered.size > 0) {
        this.scheduleGapHeal()
      }
      this.emit()
    } catch (error) {
      this.pending = []
      const status = (error as { statusCode?: number } | undefined)?.statusCode
      // 404 initial dans la fenêtre de création : la projection peut être en retard, on rejoue
      // sans afficher « reconnexion » (l'écran garde son libellé de préparation).
      const notFoundGraceActive =
        status === 404 && !this.status.loaded && this.options.notFoundGraceMs != null && Date.now() - this.startedAt < this.options.notFoundGraceMs
      if (notFoundGraceActive) {
        // Cadence fixe courte : la projection fraîche peut apparaître dans les 100–500 ms.
        this.retryAttempt = 0
        this.setStatus({ retrying: false })
        this.scheduleRetry(this.options.notFoundRetryDelayMs ?? 500)
      } else if (isTerminalError(error)) {
        this.retryAttempt = 0
        this.clearRetryTimer()
        this.setStatus({ retrying: false, terminalError: true })
      } else if (this.started) {
        this.retryAttempt += 1
        this.setStatus({ retrying: true })
        this.scheduleRetry()
      }
      this.emit()
    } finally {
      this.loading = false
      if (this.reloadQueued) {
        this.reloadQueued = false
        this.requestReload()
      }
    }
  }

  private scheduleRetry(delayMs?: number): void {
    if (!this.started || this.retryTimer) return
    const delay = delayMs ?? Math.min(RETRY_BASE_MS * 2 ** Math.max(0, this.retryAttempt - 1), RETRY_MAX_MS)
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined
      this.requestReload()
    }, delay)
  }

  private clearRetryTimer(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
      this.retryTimer = undefined
    }
  }

  private scheduleGapHeal(): void {
    if (this.gapTimer) return
    this.gapTimer = setTimeout(() => {
      this.gapTimer = undefined
      if (this.buffered.size > 0) {
        this.requestReload()
      }
    }, GAP_GRACE_MS)
  }

  private clearGapTimer(): void {
    if (this.gapTimer) {
      clearTimeout(this.gapTimer)
      this.gapTimer = undefined
    }
  }

  private setStatus(patch: Partial<NotificationStreamStatus>): void {
    this.status = { ...this.status, ...patch }
  }

  private reset(): void {
    this.state = this.options.initial(this.options.aggregateId)
    this.lastSequence = -1
  }

  private onMessage(body: string): void {
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return
    }
    if (!isEnvelope(parsed)) {
      return
    }
    const envelope = parsed as EventEnvelopeResponse<T>
    if (this.loading) {
      this.pending.push(envelope)
      return
    }
    // Trame live : échantillon d'horloge serveur (le replay REST n'en fournit pas).
    const receivedAt = Date.now()
    recordServerInstant(Date.parse(envelope.timestamp), receivedAt)
    this.options.onLive?.(envelope, receivedAt)
    if (envelope.sequenceNumber <= this.lastSequence) {
      return
    }
    if (envelope.sequenceNumber === this.lastSequence + 1) {
      this.applyEnvelope(envelope)
      this.drainBuffered()
      if (this.buffered.size === 0) {
        this.clearGapTimer()
        if (this.status.lagging) {
          this.setStatus({ lagging: false })
        }
      }
      this.emit()
      return
    }
    // Trou de séquence : on attend brièvement la trame manquante avant de rejouer l'historique.
    this.buffered.set(envelope.sequenceNumber, envelope)
    this.setStatus({ lagging: true })
    this.scheduleGapHeal()
  }

  private drainBuffered(): void {
    let next = this.buffered.get(this.lastSequence + 1)
    while (next) {
      this.buffered.delete(next.sequenceNumber)
      this.applyEnvelope(next)
      next = this.buffered.get(this.lastSequence + 1)
    }
  }

  private applyEnvelope(envelope: EventEnvelopeResponse<T>): void {
    const next = this.options.apply(this.state, envelope.payload)
    // Garde défensive : ne jamais corrompre l'état avec `undefined`.
    if (next !== undefined) {
      this.state = next
    }
    this.lastSequence = Math.max(this.lastSequence, envelope.sequenceNumber)
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener())
  }
}
