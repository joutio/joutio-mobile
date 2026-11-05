import { Client, ReconnectionTimeMode, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { AppState } from 'react-native'
import { create } from 'zustand'
import { ensureFreshAccessToken } from './auth'
import { config } from './config'

/**
 * Connexion STOMP unique au BFF (`/ws/websocket`, transport WebSocket brut), portée de `joutio-web/src/lib/ws.ts`.
 * Plusieurs abonnements partagent le client ; à chaque (re)connexion, toutes les destinations sont ré-abonnées et
 * leurs `onConnect` rappelés (les flux rejouent alors leur historique REST pour combler la coupure).
 *
 * Heartbeat 10 s dans les deux sens : un battement manqué ferme le socket, la connexion passe en `reconnecting` et
 * l'écran de jeu affiche la reconnexion. Fermée en arrière-plan, rouverte au premier plan.
 */
export type ConnectionStatus = 'idle' | 'connecting' | 'online' | 'reconnecting'

interface ConnectionState {
  status: ConnectionStatus
  /** Instant (epoch ms) de la dernière perte de connexion, pour le décompte de reconnexion. */
  lostAt: number | null
}

export const useConnectionStore = create<ConnectionState>(() => ({ status: 'idle', lostAt: null }))

const setStatus = (status: ConnectionStatus) => {
  const current = useConnectionStore.getState()
  if (current.status === status) return
  useConnectionStore.setState({ status, lostAt: status === 'reconnecting' ? (current.lostAt ?? Date.now()) : status === 'online' ? null : current.lostAt })
}

type MessageHandler = (message: IMessage) => void

const destinations = new Map<string, Set<MessageHandler>>()
const connectHandlers = new Map<string, Set<() => void>>()
const brokerSubscriptions = new Map<string, StompSubscription>()
let active = false
let suspended = AppState.currentState === 'background'
let everConnected = false
let retained = 0

const wsUrl = () => `${config.apiUrl.replace(/^http/, 'ws')}/ws/websocket`

const client = new Client({
  webSocketFactory: () => new WebSocket(wsUrl()),
  reconnectDelay: 1000,
  reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
  // Un duel ne peut pas attendre : au plus 5 s entre deux tentatives.
  maxReconnectDelay: 5_000,
  heartbeatIncoming: 10_000,
  heartbeatOutgoing: 10_000,
  // React Native : le WebSocket ne transmet pas l'octet NUL des trames texte.
  forceBinaryWSFrames: true,
  appendMissingNULLonIncoming: true,
  debug: () => undefined,
  beforeConnect: async () => {
    setStatus(everConnected ? 'reconnecting' : 'connecting')
    // Le jeton n'est présenté qu'au CONNECT : on le renouvelle s'il est sur le point d'expirer.
    const token = await ensureFreshAccessToken()
    client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {}
  },
})

function brokerSubscribe(destination: string) {
  brokerSubscriptions.set(
    destination,
    client.subscribe(destination, (message) => destinations.get(destination)?.forEach((handler) => handler(message))),
  )
}

client.onConnect = () => {
  everConnected = true
  setStatus('online')
  brokerSubscriptions.clear()
  destinations.forEach((_handlers, destination) => brokerSubscribe(destination))
  connectHandlers.forEach((handlers) => handlers.forEach((onConnect) => onConnect()))
}
client.onWebSocketClose = () => {
  brokerSubscriptions.clear()
  if (active && !suspended) setStatus('reconnecting')
}
client.onStompError = () => {
  // Refus du broker (jeton expiré, par exemple) : la reconnexion relira un jeton frais.
  if (active && !suspended) setStatus('reconnecting')
}

/** Délai avant de couper une connexion sans abonnement : un écran qui en remplace un autre se réabonne entre-temps. */
const IDLE_GRACE_MS = 3000
let idleTimer: ReturnType<typeof setTimeout> | null = null
let deactivating: Promise<void> | null = null

function activate() {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  active = true
  if (suspended) return
  // Une désactivation en cours laisse `client.active` vrai : on attend sa fin avant de relancer.
  if (deactivating) {
    void deactivating.then(() => {
      if (active && !suspended && !client.active) client.activate()
    })
    return
  }
  if (!client.active) client.activate()
}

function deactivateIfIdle() {
  if (destinations.size > 0 || retained > 0 || !active || idleTimer) return
  idleTimer = setTimeout(() => {
    idleTimer = null
    if (destinations.size > 0 || retained > 0) return
    active = false
    everConnected = false
    setStatus('idle')
    deactivating = client.deactivate().finally(() => {
      deactivating = null
    })
  }, IDLE_GRACE_MS)
}

AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    suspended = true
    if (client.active)
      deactivating = client.deactivate().finally(() => {
        deactivating = null
      })
  } else if (state === 'active' && suspended) {
    suspended = false
    if (active) activate()
  }
})

/**
 * Abonne `handler` à une destination ; `onConnect` est rappelé à chaque (re)connexion, et tout de suite si la connexion
 * est déjà établie. Renvoie la fonction de désabonnement.
 */
export function subscribeStomp(destination: string, handler: MessageHandler, onConnect?: () => void): () => void {
  let handlers = destinations.get(destination)
  if (!handlers) {
    handlers = new Set()
    destinations.set(destination, handlers)
  }
  handlers.add(handler)
  if (onConnect) {
    let set = connectHandlers.get(destination)
    if (!set) {
      set = new Set()
      connectHandlers.set(destination, set)
    }
    set.add(onConnect)
  }

  if (client.connected) {
    if (!brokerSubscriptions.has(destination)) brokerSubscribe(destination)
    onConnect?.()
  } else {
    activate()
  }

  return () => {
    const current = destinations.get(destination)
    if (current) {
      current.delete(handler)
      if (current.size === 0) {
        destinations.delete(destination)
        brokerSubscriptions.get(destination)?.unsubscribe()
        brokerSubscriptions.delete(destination)
      }
    }
    if (onConnect) {
      const set = connectHandlers.get(destination)
      set?.delete(onConnect)
      if (set?.size === 0) connectHandlers.delete(destination)
    }
    deactivateIfIdle()
  }
}

/** Garde la connexion ouverte sans abonnement (présence en ligne). Renvoie la fonction de libération. */
export function retainStompConnection(): () => void {
  retained += 1
  activate()
  let released = false
  return () => {
    if (released) return
    released = true
    retained = Math.max(0, retained - 1)
    deactivateIfIdle()
  }
}

export type { IMessage }
