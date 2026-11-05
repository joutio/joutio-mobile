import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { api } from '../api'
import { queryKeys } from '../query-keys'

/**
 * Horloge serveur (port de `joutio-web/src/shared/clock`) : décalage local → serveur mesuré par `GET /api/clock` à
 * l'ouverture d'un écran de jeu et au retour au premier plan, puis **ré-ancré sur chaque trame temps réel** (instant
 * serveur de l'événement). Pas de mesure périodique : le temps réel suffit à l'entretenir. Les échéances (chrono,
 * fenêtres d'animation) restent ainsi justes malgré une montre d'appareil décalée.
 */
let offsetMs = 0
let sampled = false
const listeners = new Set<() => void>()

/** Ré-ancre l'horloge sur un instant serveur (ms epoch) reçu à `receivedAt`. */
export function recordServerInstant(serverEpochMs: number, receivedAt: number = Date.now()) {
  if (!Number.isFinite(serverEpochMs)) return
  offsetMs = serverEpochMs - receivedAt
  sampled = true
  listeners.forEach((listener) => listener())
}

/** Instant serveur courant estimé (ms epoch). */
export const readServerNow = () => Date.now() + offsetMs

const isSynced = () => sampled
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

interface ServerTimeView {
  epochMillis: number
}

export function useServerClock() {
  const { data, dataUpdatedAt, refetch } = useQuery({
    queryKey: queryKeys.serverTime(),
    queryFn: () => api.get<ServerTimeView>('/api/clock'),
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
