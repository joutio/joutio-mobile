import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { queryKeys } from '@/lib/query-keys'
import type { TitlesView, TopicOverviewView } from '@/shared/types/bff'
import { topicService } from '../lib/topic-service'

/** En-tête, statistiques et progression du sujet. */
export function useTopicOverview(topicId: string) {
  return useQuery({ queryKey: queryKeys.topic.overview(topicId), queryFn: () => topicService.overview(topicId), staleTime: 30_000 })
}

/** Top 10 du mois et ma ligne. */
export function useTopicLeaderboard(topicId: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.topic.leaderboard(topicId), queryFn: () => topicService.leaderboard(topicId), enabled, staleTime: 60_000 })
}

/** Mes 10 dernières parties du sujet. */
export function useTopicGames(topicId: string, enabled = true) {
  const me = useMe(true)
  const userId = me.data?.userId
  return useQuery({
    queryKey: queryKeys.topic.games(topicId, userId ?? ''),
    queryFn: () => topicService.games(userId ?? '', topicId),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
  })
}

/** Mes titres (pour savoir lequel est porté). */
export function useMyTitles(enabled = true) {
  const me = useMe(true)
  const userId = me.data?.userId
  return useQuery({
    queryKey: queryKeys.profiles.titles(userId ?? ''),
    queryFn: () => topicService.titles(userId ?? ''),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
  })
}

/** Suivre / ne plus suivre, appliqué tout de suite (et annulé si le BFF refuse). */
export function useFollowTopic(topicId: string) {
  const client = useQueryClient()
  const key = queryKeys.topic.overview(topicId)
  return useMutation({
    mutationFn: (follow: boolean) => topicService.follow(topicId, follow),
    onMutate: async (follow) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<TopicOverviewView>(key)
      if (previous && previous.topic.followed !== follow) {
        client.setQueryData<TopicOverviewView>(key, {
          ...previous,
          topic: { ...previous.topic, followed: follow, followersCount: Math.max(0, previous.topic.followersCount + (follow ? 1 : -1)) },
        })
      }
      return { previous }
    },
    onError: (_error, follow, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      toast.error(follow ? "Le sujet n'a pas pu être suivi" : "Le sujet n'a pas pu être retiré", { description: 'Vérifie ta connexion, puis réessaie.' })
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: queryKeys.home() })
      void client.invalidateQueries({ queryKey: ['topics'] })
    },
  })
}

/** Porter un titre du sujet. */
export function useWearTitle() {
  const client = useQueryClient()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const key = queryKeys.profiles.titles(userId)
  return useMutation({
    mutationFn: (titleKey: string) => topicService.wearTitle(userId, titleKey),
    onMutate: async (titleKey) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<TitlesView>(key)
      if (previous) client.setQueryData<TitlesView>(key, { ...previous, equippedKey: titleKey })
      return { previous }
    },
    onError: (_error, _key, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      toast.error("Le titre n'a pas pu être porté", { description: 'Vérifie ta connexion, puis réessaie.' })
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: key })
      void client.invalidateQueries({ queryKey: queryKeys.me() })
    },
  })
}
