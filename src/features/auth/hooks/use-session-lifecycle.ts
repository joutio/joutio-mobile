import { useEffect } from 'react'
import { onSessionEnded } from '@/lib/auth'
import { useSessionStore } from '../session-store'

/**
 * Relie les fins de session des appels API (401, 403) à l'état de l'app. Une session terminée change de cache
 * (`JoutioRoot`, un cache par session) : un autre compte ne voit jamais les données du précédent.
 */
export function useSessionLifecycle() {
  const endSession = useSessionStore((state) => state.endSession)
  useEffect(() => onSessionEnded((reason, suspension) => endSession(reason, suspension)), [endSession])
}
