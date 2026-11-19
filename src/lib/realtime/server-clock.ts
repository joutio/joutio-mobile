import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { AppState } from 'react-native'
import { addLiveFrame, addRoundTrip, CLOCK_BURST, clockOffset, emptyClock, type ClockState, type RoundTrip } from '@joutio/client/game'
import type { ServerTimeView } from '@joutio/client/query'
import { api } from '../api'

/**
 * Horloge serveur (port de `joutio-web/src/lib/realtime/server-clock.ts`, règles dans `@joutio/client/game`,
 * `duel-horloge-ntp`) : une rafale d'allers-retours `GET /api/clock` à l'ouverture d'un écran de jeu et au retour au
 * premier plan garde l'échantillon de RTT minimal, puis chaque trame temps réel peut **relever** le décalage (jamais le
 * baisser : une trame retardée sous-estime). Les échéances (chrono, fenêtres d'animation) restent justes malgré une
 * montre d'appareil décalée.
 */
let clock: ClockState = emptyClock
const listeners = new Set<() => void>()

function setClock(next: ClockState) {
  if (next === clock) return
  clock = next
  listeners.forEach((listener) => listener())
}

/** Ré-ancre l'horloge sur l'instant serveur (ms epoch) d'une trame temps réel reçue à `receivedAt`. */
export function recordServerInstant(serverEpochMs: number, receivedAt: number = Date.now()) {
  setClock(addLiveFrame(clock, serverEpochMs, receivedAt))
}

/** Instant serveur courant estimé (ms epoch). */
export const readServerNow = () => Date.now() + (clockOffset(clock) ?? 0)

let syncing: Promise<void> | null = null

/**
 * Rafale de mesures, appliquée d'un bloc à la fin sur l'horloge courante : pendant un duel, le décalage ne recule donc
 * qu'une fois par rafale, et les trames reçues entre-temps restent comptées. Une seule rafale à la fois.
 */
export function syncServerClock(): Promise<void> {
  syncing ??= (async () => {
    const trips: RoundTrip[] = []
    for (let n = 0; n < CLOCK_BURST; n += 1) {
      const sentAt = Date.now()
      try {
        const { epochMillis } = await api.get<ServerTimeView>('/api/clock')
        trips.push({ sentAt, receivedAt: Date.now(), serverEpochMs: epochMillis })
      } catch {
        // Mesure perdue : les autres suffisent, la rafale suivante réessaie.
      }
    }
    setClock(trips.reduce(addRoundTrip, clock))
  })().finally(() => {
    syncing = null
  })
  return syncing
}

const isSynced = () => clockOffset(clock) !== null
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useServerClock() {
  useEffect(() => {
    void syncServerClock()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncServerClock()
    })
    return () => subscription.remove()
  }, [])

  const synced = useSyncExternalStore(subscribe, isSynced, isSynced)
  const serverNow = useCallback(() => readServerNow(), [])
  return { serverNow, synced }
}
