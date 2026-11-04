import { LoginScreen, SessionEndedScreen, useSessionStore } from '@/features/auth'

/** Connexion, ou fin de session (expirée, suspendue) tant qu'elle n'a pas été vue. */
export default function Login() {
  const endReason = useSessionStore((state) => state.endReason)
  const acknowledgeEnd = useSessionStore((state) => state.acknowledgeEnd)
  if (endReason) return <SessionEndedScreen reason={endReason} onLogin={acknowledgeEnd} />
  return <LoginScreen />
}
