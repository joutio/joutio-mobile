import { useHistory, useTitles, useWearTitle as useLibWearTitle } from '@joutio/client/profile'
import {
  useFollowTopic as useLibFollowTopic,
  useTopicBoard,
  useTopicLeaderboard as useLibTopicLeaderboard,
  useTopicOverview as useLibTopicOverview,
  type RankingFilters,
} from '@joutio/client/topics'
import { toast } from '@/design-system'
import { useSessionUserId } from '@/features/auth'
import { useT } from '@/lib/i18n'

/** Dernières parties de l'onglet Parties ; l'historique complet vit dans `historique.md`. */
const GAMES_SIZE = 10

/** En-tête, statistiques et progression du sujet. */
export function useTopicOverview(topicId: string, enabled = Boolean(topicId)) {
  return useLibTopicOverview(enabled && topicId ? topicId : undefined)
}

/** Top 10 depuis toujours et ma ligne. */
export function useTopicLeaderboard(topicId: string, enabled = true) {
  return useLibTopicLeaderboard(enabled && topicId ? topicId : undefined)
}

/** Classement complet d'un sujet (période, portée, pagination). */
export function useTopicLeaderboardPage(topicId: string, filters: RankingFilters, enabled = true) {
  return useTopicBoard(enabled && topicId ? topicId : undefined, filters)
}

/** Mes dernières parties du sujet : la première page de mon historique filtré sur le sujet. */
export function useTopicGames(topicId: string) {
  const games = useHistory(useSessionUserId(), { topicId, outcome: 'ALL', sort: 'RECENT' })
  return { ...games, games: (games.data?.pages ?? [])[0]?.content.slice(0, GAMES_SIZE) }
}

/** Mes titres (pour savoir lequel est porté). */
export const useMyTitles = () => useTitles(useSessionUserId())

/** Suivre / ne plus suivre un sujet (mutation optimiste de la lib) ; un refus s'affiche en toast. */
export function useFollowTopic(topicId: string) {
  const t = useT()
  const follow = useLibFollowTopic(topicId)
  return {
    isPending: follow.isPending,
    mutate: (next: boolean) =>
      follow.mutate(next, { onError: () => toast.error(next ? t('topic.followError') : t('topic.unfollowError'), { description: t('home.errorText') }) }),
  }
}

/** Porter un titre du sujet (`null` : retirer le titre porté). */
export function useWearTitle() {
  const t = useT()
  const wear = useLibWearTitle(useSessionUserId() ?? '')
  return {
    isPending: wear.isPending,
    variables: wear.variables,
    mutate: (titleKey: string | null) =>
      wear.mutate(titleKey, { onError: () => toast.error(titleKey === null ? t('topic.removeTitleError') : t('topic.wearTitleError')) }),
  }
}
