import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import type { PlayerProfileView } from '@/shared/types/bff'
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
  return useMutation({
    mutationFn: (follow: boolean) => socialService.follow(userId, follow),
    onSuccess: (_data, follow) => {
      client.setQueryData<PlayerProfileView>(['profiles', userId, 'profile'], (previous) =>
        previous ? { ...previous, following: follow, followersCount: Math.max(0, previous.followersCount + (follow ? 1 : -1)) } : previous,
      )
      void client.invalidateQueries({ queryKey: ['contacts'] })
      void client.invalidateQueries({ queryKey: ['profiles', userId, 'profile'] })
    },
    onError: (_error, follow) =>
      toast.error(follow ? "Le joueur n'a pas pu être suivi" : "Le joueur n'a pas pu être retiré", {
        description: 'Vérifie ta connexion, puis réessaie.',
      }),
  })
}

/** Sujets joués par un joueur, pour la feuille de défi. */
export function usePlayerTopics(userId: string, enabled = true) {
  return useQuery({
    queryKey: ['profiles', userId, 'topics'],
    queryFn: () => socialService.topics(userId),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
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
