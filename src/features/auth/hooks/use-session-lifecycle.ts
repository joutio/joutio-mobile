import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { onSessionEnded } from '@/lib/auth'
import { useSessionStore } from '../session-store'

/**
 * Relie les fins de session des appels API (401, 403) à l'état de l'app. Le cache est vidé dès que la session
 * n'est plus authentifiée : un autre compte ne voit jamais les données du précédent.
 */
export function useSessionLifecycle() {
  const endSession = useSessionStore((state) => state.endSession)
  const ready = useSessionStore((state) => state.ready)
  const authenticated = useSessionStore((state) => state.authenticated)
  const queryClient = useQueryClient()

  useEffect(() => onSessionEnded(endSession), [endSession])

  useEffect(() => {
    if (ready && !authenticated) queryClient.clear()
  }, [authenticated, queryClient, ready])
}
