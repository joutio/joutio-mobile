import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { applyFollow, headToHeadQuery, optimisticUpdate, profileQuery, queryKeys } from '@joutio/client/query'
import type { MeView, PlayerProfileView } from '@joutio/client/api-types'
import { socialService } from '../lib/social-service'
import { useT } from '@/lib/i18n'
import { api } from '@/lib/api'

/** Fiche publique d'un joueur. */
export function usePlayerProfile(userId: string, enabled = true) {
  return useQuery({
    ...profileQuery(api, userId),
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
  })
}

/** Fiche du joueur connecté (compteurs d'abonnements pour l'écran Social). */
export function useMyProfile(enabled = true) {
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  return usePlayerProfile(userId, enabled && Boolean(userId))
}

/** Suivre / ne plus suivre un joueur, avec mise à jour immédiate de la fiche et des listes. */
export function useFollowPlayer(userId: string) {
  const t = useT()
  const client = useQueryClient()
  const myId = useMe(true).data?.userId ?? ''
  return useMutation({
    mutationFn: (follow: boolean) => socialService.follow(userId, follow),
    onMutate: (follow: boolean) =>
      optimisticUpdate(client, [queryKeys.me(), ['profiles'], ['contacts']], () => {
        const previous = client.getQueryData<PlayerProfileView>(queryKeys.profiles.profile(userId))
        const delta = previous?.following === follow ? 0 : follow ? 1 : -1
        client.setQueryData<PlayerProfileView>(queryKeys.profiles.profile(userId), (profile) =>
          profile ? { ...profile, following: follow, followersCount: Math.max(0, profile.followersCount + delta) } : profile,
        )
        client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, followingCount: Math.max(0, me.followingCount + delta) } : me))
        client.setQueryData<PlayerProfileView>(queryKeys.profiles.profile(myId), (profile) =>
          profile ? { ...profile, followingCount: Math.max(0, profile.followingCount + delta) } : profile,
        )
        // Listes de contacts : drapeau `following` partout, carte ajoutée à sa place de tri dans mes abonnements (ou retirée).
        const profile = client.getQueryData<PlayerProfileView>(queryKeys.profiles.profile(userId))
        if (myId && profile) applyFollow(client, myId, profile, follow)
      }),
    onError: (_error, follow, context) => {
      context?.rollback()
      toast.error(follow ? t('mobile.social.followFailed') : t('mobile.social.unfollowFailed'), {
        description: t('home.errorText'),
      })
    },
  })
}

/** Bilan des duels communs, du point de vue du joueur connecté (`against` = l'autre joueur). */
export function useHeadToHead(against: string) {
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  return useQuery({
    ...headToHeadQuery(api, userId, against),
    enabled: Boolean(userId && against),
    staleTime: 60_000,
  })
}
