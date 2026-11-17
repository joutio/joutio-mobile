import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type {
  GameHistoryItemView,
  LeaderboardPeriod,
  LeaderboardScope,
  PageResponse,
  TopicLeaderboardView,
} from '@joutio/client/api-types'

/** Page complète des classements : 20 joueurs par page. */
export const RANKING_SIZE = 20

export interface RankingFilters {
  period: LeaderboardPeriod
  scope: LeaderboardScope
  /** `YYYY-MM`, utilisé par la période mensuelle. */
  month?: string
}

export type RankingFilterState = Pick<RankingFilters, 'period' | 'scope'>

/** Tous les classements : depuis toujours, monde entier par défaut, comme l'onglet de la Fiche sujet (2026-11-06). */
export const DEFAULT_RANKING_FILTERS: RankingFilterState = { period: 'ALL_TIME', scope: 'WORLD' }
/** Dernières parties de l'onglet Parties ; l'historique complet vit dans `historique.md`. */
export const GAMES_SIZE = 10


export const topicService = {
  /** Page complète des classements (`classements.md`) : période, portée et pagination. */
  leaderboardPage: (topicId: string, filters: RankingFilters, page: number) =>
    api.get<TopicLeaderboardView>(ENDPOINTS.topics.leaderboard(topicId), {
      query: {
        period: filters.period,
        scope: filters.scope,
        month: filters.period === 'MONTHLY' ? filters.month : undefined,
        page,
        size: RANKING_SIZE,
      },
    }),

  /** Mes dernières parties du sujet (le BFF n'expose pas celles de tous les joueurs). */
  games: (userId: string, topicId: string) =>
    api.get<PageResponse<GameHistoryItemView>>(ENDPOINTS.profiles.games(userId), { query: { topicId, sort: 'RECENT', page: 0, size: GAMES_SIZE } }),

  follow: (topicId: string, follow: boolean) => (follow ? api.put<void>(ENDPOINTS.topics.follow(topicId)) : api.delete<void>(ENDPOINTS.topics.follow(topicId))),

  /** Porte un titre (`topicId:TIER`), ou retire le titre porté (`null`). */
  wearTitle: (userId: string, titleKey: string | null) => api.put<void>(ENDPOINTS.profiles.title(userId), { titleKey }),
}
