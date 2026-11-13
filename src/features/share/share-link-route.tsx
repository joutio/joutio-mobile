import type { ShareKind } from '@joutio/client-domain/share'
import { Redirect, useLocalSearchParams, type Href } from 'expo-router'
import { useEffect } from 'react'
import { useSessionStore } from '@/features/auth'
import { usePendingReferral } from '@/shared/stores/pending-referral-store'

/**
 * Lien universel `go.joutio.com/{p|t|j|i}/{id}` ouvert par l'app installée (`partage.md` § 2) : le code de parrainage
 * est gardé, puis l'écran correspondant s'ouvre. Sans session, l'arrivée passe par la connexion (le salon garde sa
 * reprise par `join/[roomId]`).
 */
export function ShareLinkRoute({ kind }: { kind: ShareKind }) {
  const { id, ref } = useLocalSearchParams<{ id: string; ref?: string }>()
  const capture = usePendingReferral((state) => state.capture)
  const authenticated = useSessionStore((state) => state.authenticated)
  useEffect(() => capture(kind === 'invite' ? id : ref), [capture, kind, id, ref])

  if (kind === 'room') return <Redirect href={{ pathname: '/join/[roomId]', params: { roomId: id } }} />
  if (!authenticated || kind === 'invite') return <Redirect href="/" />
  const href: Href = kind === 'profile' ? { pathname: '/home/player/[id]', params: { id } } : { pathname: '/home/topic/[id]', params: { id } }
  return <Redirect href={href} />
}
