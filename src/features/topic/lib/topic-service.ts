import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type {
  GameHistoryItemView,
  LeaderboardPeriod,
  LeaderboardScope,
  PageResponse,
  TitlesView,
  TopicLeaderboardView,
  TopicOverviewView,
} from '@/shared/types/bff'

/** Top 10 de l'onglet Classement ; la page complète vit dans Classements (`classements.md`). */
export const BOARD_SIZE = 10
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

/** Onglet Classement de la fiche sujet : XP cumulée depuis toujours, monde entier (décision du 2026-11-06). */
export const BOARD_PERIOD: LeaderboardPeriod = 'ALL_TIME'
export const BOARD_SCOPE: LeaderboardScope = 'WORLD'

export const topicService = {
  overview: (topicId: string) => api.get<TopicOverviewView>(ENDPOINTS.topics.overview(topicId)),

  leaderboard: (topicId: string) =>
    api.get<TopicLeaderboardView>(ENDPOINTS.topics.leaderboard(topicId), {
      params: { period: BOARD_PERIOD, scope: BOARD_SCOPE, page: 0, size: BOARD_SIZE },
    }),

  /** Page complète des classements (`classements.md`) : période, portée et pagination. */
  leaderboardPage: (topicId: string, filters: RankingFilters, page: number) =>
    api.get<TopicLeaderboardView>(ENDPOINTS.topics.leaderboard(topicId), {
      params: {
        period: filters.period,
        scope: filters.scope,
        month: filters.period === 'MONTHLY' ? filters.month : undefined,
        page,
        size: RANKING_SIZE,
      },
    }),

  /** Mes dernières parties du sujet (le BFF n'expose pas celles de tous les joueurs). */
  games: (userId: string, topicId: string) =>
    api.get<PageResponse<GameHistoryItemView>>(ENDPOINTS.profiles.games(userId), { params: { topicId, sort: 'RECENT', page: 0, size: GAMES_SIZE } }),

  titles: (userId: string) => api.get<TitlesView>(ENDPOINTS.profiles.titles(userId)),

  follow: (topicId: string, follow: boolean) => (follow ? api.put<void>(ENDPOINTS.topics.follow(topicId)) : api.delete<void>(ENDPOINTS.topics.follow(topicId))),

  /** Porte un titre (`topicId:TIER`), ou retire le titre porté (`null`). */
  wearTitle: (userId: string, titleKey: string | null) => api.put<void>(ENDPOINTS.profiles.title(userId), { titleKey }),
}
