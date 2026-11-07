import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { haptic } from '@/design-system'
import { reconnectStomp, useConnectionStore } from '@/lib/ws'
import { refreshNetworkState, useOnline } from './use-online'

/**
 * État de la bannière de connexion (`etats-systeme.md`, Hors connexion et Reconnexion) :
 * - `offline` : plus de réseau ; `reconnecting` : réseau présent, temps réel coupé ;
 * - `retrying` : « Réessayer » en cours ; `failed` : la tentative n'a rien rétabli ;
 * - `restored` : « Connexion rétablie », affichée brièvement puis retirée.
 */
export type ConnectionBannerState = 'hidden' | 'offline' | 'reconnecting' | 'retrying' | 'failed' | 'restored'

/** Coupure tolérée avant d'alerter : un retour au premier plan rouvre le socket en une à deux secondes. */
const GRACE_MS = 2500
/** Durée minimale de la roue : un échec instantané doit se voir. */
const MIN_RETRY_MS = 900
/** Attente maximale du rétablissement après « Réessayer ». */
const RETRY_TIMEOUT_MS = 5000
const RESTORED_MS = 1500

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function useConnectionBanner() {
  const online = useOnline()
  const realtimeDown = useConnectionStore((state) => state.status === 'reconnecting')
  const problem = !online || realtimeDown
  const queryClient = useQueryClient()

  const [alerting, setAlerting] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'retrying' | 'failed' | 'restored'>('idle')
  const problemRef = useRef(problem)
  problemRef.current = problem
  // Relancé à chaque retour au premier plan : la coupure doit durer `GRACE_MS` après la reprise pour alerter.
  const [resumeKey, setResumeKey] = useState(0)

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setResumeKey((key) => key + 1)
    })
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (problem) {
      if (alerting) return
      const timer = setTimeout(() => setAlerting(true), GRACE_MS)
      return () => clearTimeout(timer)
    }
    if (!alerting) return
    // Coupure résolue alors que la bannière était là : « Connexion rétablie », puis on la retire.
    setPhase('restored')
    const timer = setTimeout(() => {
      setAlerting(false)
      setPhase('idle')
    }, RESTORED_MS)
    return () => clearTimeout(timer)
  }, [problem, alerting, resumeKey])

  const retry = useCallback(async () => {
    setPhase('retrying')
    const started = Date.now()
    const networkOk = await refreshNetworkState()
    if (networkOk) {
      void reconnectStomp()
      void queryClient.refetchQueries({ type: 'active' })
    }
    // On laisse au socket le temps de rouvrir, sans dépasser `RETRY_TIMEOUT_MS`.
    while (problemRef.current && Date.now() - started < RETRY_TIMEOUT_MS) await sleep(250)
    const elapsed = Date.now() - started
    if (elapsed < MIN_RETRY_MS) await sleep(MIN_RETRY_MS - elapsed)
    if (problemRef.current) {
      haptic('error')
      setPhase('failed')
    }
    // Rétabli : l'effet ci-dessus passe en `restored`.
  }, [queryClient])

  let state: ConnectionBannerState = 'hidden'
  if (phase === 'restored') state = 'restored'
  else if (alerting && problem) state = phase === 'retrying' ? 'retrying' : phase === 'failed' ? 'failed' : online ? 'reconnecting' : 'offline'

  return { state, retry }
}
