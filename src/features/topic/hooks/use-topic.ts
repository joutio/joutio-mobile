import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { TopicPage } from '@/features/topics/lib/topics-service'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { queryKeys } from '@/lib/query-keys'
import type { HomeView, TitlesView, TopicCardView, TopicOverviewView } from '@/shared/types/bff'
import { topicService, type RankingFilters } from '../lib/topic-service'

/** En-tête, statistiques et progression du sujet. */
export function useTopicOverview(topicId: string, enabled = Boolean(topicId)) {
  return useQuery({ queryKey: queryKeys.topic.overview(topicId), queryFn: () => topicService.overview(topicId), enabled, staleTime: 30_000 })
}

/** Top 10 du mois et ma ligne. */
export function useTopicLeaderboard(topicId: string, enabled = true) {
  return useQuery({ queryKey: queryKeys.topic.leaderboard(topicId), queryFn: () => topicService.leaderboard(topicId), enabled, staleTime: 60_000 })
}

/** Classement complet d'un sujet (période, portée, pagination). */
export function useTopicLeaderboardPage(topicId: string, filters: RankingFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.topic.leaderboardPage(topicId, filters),
    queryFn: ({ pageParam }) => topicService.leaderboardPage(topicId, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.entries.last ? undefined : pages.length),
    enabled: enabled && Boolean(topicId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
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
    onSuccess: (_result, follow) => {
      // Mise à jour sur place des listes déjà chargées (catalogue, rails de l'Accueil) : pas de rechargement complet,
      // donc pas d'attente au retour sur Sujets. Seules les listes « suivis » et leurs compteurs sont relus.
      const flip = (topic: TopicCardView) => (topic.topicId === topicId ? { ...topic, followed: follow } : topic)
      client.setQueriesData<InfiniteData<TopicPage>>({ queryKey: ['topics', 'list'] }, (data) =>
        data ? { ...data, pages: data.pages.map((page) => ({ ...page, topics: page.topics.map(flip) })) } : data,
      )
      client.setQueryData<HomeView>(queryKeys.home(), (data) =>
        data
          ? { ...data, trendingTopics: data.trendingTopics.map(flip), newTopics: data.newTopics.map(flip), recommendedTopics: data.recommendedTopics.map(flip) }
          : data,
      )
      void client.invalidateQueries({
        queryKey: ['topics', 'list'],
        predicate: (query) => (query.queryKey[2] as { followed?: boolean } | undefined)?.followed === true,
      })
      void client.invalidateQueries({
        queryKey: ['topics', 'facets'],
        predicate: (query) => (query.queryKey[3] as { followed?: boolean } | undefined)?.followed === true,
      })
      void client.invalidateQueries({ queryKey: queryKeys.home(), refetchType: 'none' })
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
