import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { api } from '../api'
import { serverTimeQuery } from '@joutio/client/query'

/**
 * Horloge serveur (port de `joutio-web/src/shared/clock`) : décalage local → serveur mesuré par `GET /api/clock` à
 * l'ouverture d'un écran de jeu et au retour au premier plan, puis **ré-ancré sur chaque trame temps réel** (instant
 * serveur de l'événement). Pas de mesure périodique : le temps réel suffit à l'entretenir. Les échéances (chrono,
 * fenêtres d'animation) restent ainsi justes malgré une montre d'appareil décalée.
 */
let offsetMs: number | null = null

/**
 * Un recul plus petit que ce seuil vient d'une trame retardée (la latence du réseau réduit `serveur - réception`), pas
 * d'un vrai décalage : l'ignorer garde une horloge qui ne recule jamais, sinon une scène du duel repassait en arrière et
 * son intro se rejouait (2026-11-19). Un recul plus grand (montre de l'appareil changée) est appliqué.
 */
export const CLOCK_BACKSTEP_TOLERANCE_MS = 300

/** Décalage retenu après un échantillon : on garde le plus grand, sauf vrai recalage. */
export function nextClockOffset(current: number | null, sample: number): number {
  if (current === null || sample >= current || current - sample >= CLOCK_BACKSTEP_TOLERANCE_MS) return sample
  return current
}
const listeners = new Set<() => void>()

/** Ré-ancre l'horloge sur un instant serveur (ms epoch) reçu à `receivedAt`. */
export function recordServerInstant(serverEpochMs: number, receivedAt: number = Date.now()) {
  if (!Number.isFinite(serverEpochMs)) return
  offsetMs = nextClockOffset(offsetMs, serverEpochMs - receivedAt)
  listeners.forEach((listener) => listener())
}

/** Instant serveur courant estimé (ms epoch). */
export const readServerNow = () => Date.now() + (offsetMs ?? 0)

const isSynced = () => offsetMs !== null
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useServerClock() {
  const { data, dataUpdatedAt, refetch } = useQuery({
    ...serverTimeQuery(api),
    refetchOnMount: 'always',
    staleTime: Infinity,
    retry: 3,
  })

  useEffect(() => {
    // `dataUpdatedAt` (instant de la mesure) : un cache rejoué garde le même décalage.
    if (data) recordServerInstant(data.epochMillis, dataUpdatedAt)
  }, [data, dataUpdatedAt])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refetch()
    })
    return () => subscription.remove()
  }, [refetch])

  const synced = useSyncExternalStore(subscribe, isSynced, isSynced)
  const serverNow = useCallback(() => readServerNow(), [])
  return { serverNow, synced }
}
