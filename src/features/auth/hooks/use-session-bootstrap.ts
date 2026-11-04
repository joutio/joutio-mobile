import { useEffect } from 'react'
import { restoreSession } from '@/lib/auth'
import { useSessionStore } from '../session-store'

/** Restaure la session une fois au démarrage, avant tout écran protégé. */
export function useSessionBootstrap() {
  const setSession = useSessionStore((state) => state.setSession)
  const endSession = useSessionStore((state) => state.endSession)
  const setReady = useSessionStore((state) => state.setReady)

  useEffect(() => {
    let cancelled = false
    restoreSession()
      .then((result) => {
        if (cancelled) return
        if (result.reason) endSession(result.reason)
        else setSession(result.authenticated)
      })
      .catch(() => {
        if (!cancelled) setSession(false)
      })
      .finally(() => {
        if (!cancelled) setReady()
      })
    return () => {
      cancelled = true
    }
  }, [endSession, setSession, setReady])
}
