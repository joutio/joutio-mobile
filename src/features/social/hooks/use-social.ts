import { useHeadToHead as useLibHeadToHead, useProfile } from '@joutio/client/profile'
import { useBlockPlayer as useLibBlockPlayer, useFollowPlayer as useLibFollowPlayer } from '@joutio/client/social'
import { toast } from '@/design-system'
import { useSessionUserId } from '@/features/auth'
import { useT } from '@/lib/i18n'

/** Fiche publique d'un joueur ; `enabled` faux ou identifiant vide : aucune lecture. */
export function usePlayerProfile(userId: string, enabled = true) {
  return useProfile(enabled && userId ? userId : undefined)
}

/** Fiche du joueur connecté (compteurs d'abonnements pour l'écran Social). */
export function useMyProfile(enabled = true) {
  return usePlayerProfile(useSessionUserId() ?? '', enabled)
}

/** Suivre / ne plus suivre un joueur (mutation optimiste de la lib) ; un refus s'affiche en toast. */
export function useFollowPlayer(userId: string) {
  const t = useT()
  const follow = useLibFollowPlayer(useSessionUserId() ?? '', userId)
  return {
    isPending: follow.isPending,
    variables: follow.variables,
    mutate: (next: boolean) =>
      follow.mutate(next, {
        onError: () => toast.error(next ? t('mobile.social.followFailed') : t('mobile.social.unfollowFailed'), { description: t('home.errorText') }),
      }),
  }
}

/** Bloquer / débloquer un joueur (mutation optimiste de la lib, effet symétrique sur toutes les vues), avec ses toasts. */
export function useBlockPlayer(player: { userId: string; pseudonym: string }) {
  const t = useT()
  const block = useLibBlockPlayer(useSessionUserId() ?? '', player.userId)
  return {
    isPending: block.isPending,
    variables: block.variables,
    mutate: (next: boolean) =>
      block.mutate(next, {
        onSuccess: () => toast.success(t(next ? 'player.blockedToast' : 'player.unblockedToast', { name: player.pseudonym })),
        onError: () => toast.error(t(next ? 'player.blockError' : 'player.unblockError'), { description: t('home.errorText') }),
      }),
  }
}

/** Bilan des duels communs, du point de vue du joueur connecté (`against` = l'autre joueur). */
export function useHeadToHead(against: string) {
  return useLibHeadToHead(useSessionUserId(), against)
}
