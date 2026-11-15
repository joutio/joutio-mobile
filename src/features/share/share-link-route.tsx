import type { ShareKind } from '@joutio/client/share'
import { Redirect, useLocalSearchParams, type Href } from 'expo-router'
import { useSessionStore } from '@/features/auth'

/**
 * Lien universel `go.joutio.com/{p|t|j}/{id}` ouvert par l'app installée (`partage.md` § 2) : l'écran correspondant
 * s'ouvre. Sans session, l'arrivée passe par la connexion (le salon garde sa reprise par `join/[roomId]`).
 */
export function ShareLinkRoute({ kind }: { kind: ShareKind }) {
  const { id } = useLocalSearchParams<{ id: string }>()
  const authenticated = useSessionStore((state) => state.authenticated)

  if (kind === 'room') return <Redirect href={{ pathname: '/join/[roomId]', params: { roomId: id } }} />
  if (!authenticated) return <Redirect href="/" />
  const href: Href = kind === 'profile' ? { pathname: '/home/player/[id]', params: { id } } : { pathname: '/home/topic/[id]', params: { id } }
  return <Redirect href={href} />
}
