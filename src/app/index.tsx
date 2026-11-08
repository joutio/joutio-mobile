import { Redirect } from 'expo-router'
import { useSessionStore } from '@/features/auth'
import { useMe } from '@/features/me'
import { usePendingJoin } from '@/shared/stores/pending-join-store'

/** Entrée normale selon la session, avec reprise d'un lien de salon après connexion. */
export default function Index() {
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(authenticated)
  const pendingJoin = usePendingJoin((state) => state.roomId)
  if (!authenticated) return <Redirect href="/login" />
  // Lien de salon ouvert avant la connexion : on y revient une fois le joueur prêt.
  if (pendingJoin && me.data?.onboardingCompleted) return <Redirect href={{ pathname: '/join/[roomId]', params: { roomId: pendingJoin } }} />
  return <Redirect href={me.data?.onboardingCompleted ? '/home' : '/universes'} />
}
