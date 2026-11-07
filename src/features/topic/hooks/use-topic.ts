import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import type { TopicPage } from '@/features/topics/lib/topics-service'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { optimisticUpdate } from '@/lib/optimistic-cache'
import { queryKeys } from '@/lib/query-keys'
import type { HomeView, TitlesView, TopicCardView, TopicOverviewView, MeView, PlayerProfileView } from '@/shared/types/bff'
import { topicService, type RankingFilters } from '../lib/topic-service'

/** En-tête, statistiques et progression du sujet. */
export function useTopicOverview(topicId: string, enabled = Boolean(topicId)) {
  return useQuery({ queryKey: queryKeys.topic.overview(topicId), queryFn: () => topicService.overview(topicId), enabled, staleTime: 30_000 })
}

/** Top 10 depuis toujours et ma ligne. */
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
    onMutate: (follow: boolean) =>
      optimisticUpdate(client, [key, ['topics'], queryKeys.home()], () => {
        const previous = client.getQueryData<TopicOverviewView>(key)
        if (previous)
          client.setQueryData<TopicOverviewView>(key, {
            ...previous,
            topic: {
              ...previous.topic,
              followed: follow,
              followersCount: Math.max(0, previous.topic.followersCount + (previous.topic.followed === follow ? 0 : follow ? 1 : -1)),
            },
          })
        // Mise à jour sur place des listes déjà chargées (catalogue, rails de l'Accueil) : pas de rechargement complet,
        // donc pas d'attente au retour sur Sujets. Appartenance et compteurs sont corrigés localement.
        const flip = (topic: TopicCardView) =>
          topic.topicId === topicId
            ? { ...topic, followed: follow, followersCount: Math.max(0, topic.followersCount + (topic.followed === follow ? 0 : follow ? 1 : -1)) }
            : topic
        for (const [key, data] of client.getQueriesData<InfiniteData<TopicPage>>({ queryKey: ['topics', 'list'] })) {
          const filters = key[2] as { followed?: boolean; hideFollowed?: boolean; query?: string; categories?: readonly string[] }
          const card = previous?.topic
          const add =
            follow &&
            filters.followed &&
            card &&
            !data?.pages.some((page) => page.topics.some((topic) => topic.topicId === topicId)) &&
            (!filters.query || Object.values(card.names).some((name) => name.toLowerCase().includes(filters.query!.toLowerCase()))) &&
            (!filters.categories?.length || filters.categories.includes(card.category ?? ''))
          client.setQueryData(
            key,
            data
              ? {
                  ...data,
                  pages: data.pages.map((page, index) => ({
                    ...page,
                    topics: [...(add && index === 0 ? [flip(card)] : []), ...page.topics.map(flip)].filter(
                      (topic) => !((filters.followed && !topic.followed) || (filters.hideFollowed && topic.followed)),
                    ),
                  })),
                }
              : data,
          )
        }
        const card = previous?.topic
        client.setQueryData<HomeView>(queryKeys.home(), (data) =>
          data
            ? {
                ...data,
                followedTopics: follow
                  ? data.followedTopics.some((topic) => topic.topicId === topicId)
                    ? data.followedTopics.map(flip)
                    : card
                      ? [...data.followedTopics, flip(card)]
                      : data.followedTopics
                  : data.followedTopics.filter((topic) => topic.topicId !== topicId),
                trendingTopics: data.trendingTopics.map(flip),
                newTopics: data.newTopics.map(flip),
                recommendedTopics: data.recommendedTopics.map(flip),
              }
            : data,
        )
      }),
    onError: (_error, follow, context) => {
      context?.rollback()
      toast.error(follow ? "Le sujet n'a pas pu être suivi" : "Le sujet n'a pas pu être retiré", { description: 'Vérifie ta connexion, puis réessaie.' })
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
    mutationFn: (titleKey: string | null) => topicService.wearTitle(userId, titleKey),
    onMutate: (titleKey: string | null) =>
      optimisticUpdate(client, [key, queryKeys.me(), queryKeys.profiles.profile(userId)], () => {
        client.setQueryData<TitlesView>(key, (titles) => (titles ? { ...titles, equippedKey: titleKey } : titles))
        client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, equippedTitle: titleKey } : me))
        client.setQueryData<PlayerProfileView>(queryKeys.profiles.profile(userId), (profile) => (profile ? { ...profile, equippedTitle: titleKey } : profile))
      }),
    onError: (_error, _key, context) => {
      context?.rollback()
      toast.error(_key === null ? 'Le titre n’a pas pu être enlevé' : 'Le titre n’a pas pu être porté')
    },
  })
}
