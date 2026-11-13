import { useSegments } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useCallback } from 'react'
import { useMe } from './use-me'

/** Vue joueur du BFF : `premium` n'y figure pas encore partout (seulement `MeView` et les membres d'équipe). */
type PlayerLike = object | null | undefined

const field = (player: PlayerLike, key: 'userId' | 'premium'): unknown => (player && key in player ? (player as Record<string, unknown>)[key] : undefined)

/** Piles d'onglets qui portent une Fiche joueur (`(tabs)/<pile>/player/[id]`). */
const PLAYER_PATHS = {
  home: '/home/player/[id]',
  topics: '/topics/player/[id]',
  profile: '/profile/player/[id]',
  social: '/social/player/[id]',
} as const

type Stack = keyof typeof PLAYER_PATHS

/**
 * Identité d'un joueur à l'écran (`design/specs/components/primitives.md` § Identité d'un joueur, 2026-11-12) :
 * - `premium` : `PremiumBadge` après le pseudonyme. Le joueur connecté suit `me.premium` ; les autres, le champ
 *   `premium` de leur vue dès que le BFF l'expose (front d'abord) ;
 * - `open` : action qui ouvre la fiche du joueur dans la pile de l'onglet courant (Accueil hors onglets, Social depuis
 *   Défis), le Profil pour soi. Les écrans immersifs (duel, salon, matchmaking) ne l'utilisent pas.
 */
export function usePlayerIdentity() {
  const me = useMe(true).data
  const segments = useSegments() as string[]
  const myId = me?.userId ?? null
  const myPremium = me?.premium === true
  const tab = segments[segments.indexOf('(tabs)') + 1]
  const stack: Stack = segments.includes('(tabs)') ? (tab === 'challenges' ? 'social' : tab && tab in PLAYER_PATHS ? (tab as Stack) : 'home') : 'home'

  const premium = useCallback(
    (player: PlayerLike, userId?: string | null) => {
      const id = userId ?? (field(player, 'userId') as string | null | undefined) ?? null
      if (id && id === myId) return myPremium
      return field(player, 'premium') === true
    },
    [myId, myPremium],
  )

  const open = useCallback(
    (userId: string | null | undefined): (() => void) | undefined => {
      if (!userId) return undefined
      if (userId === myId) return () => router.navigate('/profile')
      return () => router.push({ pathname: PLAYER_PATHS[stack], params: { id: userId } })
    },
    [myId, stack],
  )

  return { premium, open, myId, myPremium }
}
