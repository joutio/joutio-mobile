import { Redirect } from 'expo-router'
import { useMe } from '@joutio/client/me'
import { useSessionStore } from '@/features/auth'
import { usePendingJoin } from '@/shared/stores/pending-join-store'

/** Entrée normale selon la session, avec reprise d'un lien de salon après connexion. */
export default function Index() {
  const authenticated = useSessionStore((state) => state.authenticated)
  if (!authenticated) return <Redirect href="/login" />
  return <SignedInIndex />
}

function SignedInIndex() {
  const me = useMe()
  const pendingJoin = usePendingJoin((state) => state.roomId)
  // Lien de salon ouvert avant la connexion : on y revient une fois le joueur prêt.
  if (pendingJoin && me.data?.onboardingCompleted) return <Redirect href={{ pathname: '/join/[roomId]', params: { roomId: pendingJoin } }} />
  return <Redirect href={me.data?.onboardingCompleted ? '/home' : '/universes'} />
}
