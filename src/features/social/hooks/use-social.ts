import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { optimisticUpdate } from '@/lib/optimistic-cache'
import { queryKeys } from '@/lib/query-keys'
import type { MeView, PageResponse, PlayerCardView, PlayerProfileView } from '@joutio/client-domain/api-types'
import { socialService } from '../lib/social-service'

/** Fiche publique d'un joueur. */
export function usePlayerProfile(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['profiles', userId, 'profile'],
    queryFn: () => socialService.profile(userId),
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
        for (const [key, data] of client.getQueriesData<InfiniteData<PageResponse<PlayerCardView>>>({ queryKey: ['contacts'] })) {
          const remove = !follow && key[1] === myId && key[2] === 'following'
          const contained = data?.pages.some((page) => page.content.some((player) => player.userId === userId)) ?? false
          const add =
            follow &&
            previous &&
            key[1] === myId &&
            key[2] === 'following' &&
            !contained &&
            (!key[3] || previous.pseudonym.toLowerCase().includes(String(key[3]).toLowerCase()))
          const card: PlayerCardView | undefined = add
            ? {
                userId,
                pseudonym: previous.pseudonym,
                avatarOptions: previous.avatarOptions,
                rating: previous.progression?.rating ?? 0,
                provisional: previous.progression?.provisional ?? true,
                following: true,
                presence: previous.presence,
                suspended: previous.suspended,
              }
            : undefined
          client.setQueryData(
            key,
            data
              ? {
                  ...data,
                  pages: data.pages.map((page, index) => ({
                    ...page,
                    totalElements: remove && contained ? Math.max(0, page.totalElements - 1) : add ? page.totalElements + 1 : page.totalElements,
                    content: [
                      ...(card && index === 0 ? [card] : []),
                      ...page.content
                        .filter((player) => !(remove && player.userId === userId))
                        .map((player) => (player.userId === userId ? { ...player, following: follow } : player)),
                    ],
                  })),
                }
              : data,
          )
        }
      }),
    onError: (_error, follow, context) => {
      context?.rollback()
      toast.error(follow ? "Le joueur n'a pas pu être suivi" : "Le joueur n'a pas pu être retiré", {
        description: 'Vérifie ta connexion, puis réessaie.',
      })
    },
  })
}

/** Bilan des duels communs, du point de vue du joueur connecté (`against` = l'autre joueur). */
export function useHeadToHead(against: string) {
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  return useQuery({
    queryKey: ['profiles', userId, 'head-to-head', against],
    queryFn: () => socialService.headToHead(userId, against),
    enabled: Boolean(userId && against),
    staleTime: 60_000,
  })
}
