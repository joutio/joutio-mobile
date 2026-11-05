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
/** Dernières parties de l'onglet Parties ; l'historique complet vit dans `historique.md`. */
export const GAMES_SIZE = 10

/** Légende de l'onglet Classement : XP du mois, monde entier. */
export const BOARD_PERIOD: LeaderboardPeriod = 'MONTHLY'
export const BOARD_SCOPE: LeaderboardScope = 'WORLD'

export const topicService = {
  overview: (topicId: string) => api.get<TopicOverviewView>(ENDPOINTS.topics.overview(topicId)),

  leaderboard: (topicId: string) =>
    api.get<TopicLeaderboardView>(ENDPOINTS.topics.leaderboard(topicId), {
      params: { period: BOARD_PERIOD, scope: BOARD_SCOPE, page: 0, size: BOARD_SIZE },
    }),

  /** Mes dernières parties du sujet (le BFF n'expose pas celles de tous les joueurs). */
  games: (userId: string, topicId: string) =>
    api.get<PageResponse<GameHistoryItemView>>(ENDPOINTS.profiles.games(userId), { params: { topicId, sort: 'RECENT', page: 0, size: GAMES_SIZE } }),

  titles: (userId: string) => api.get<TitlesView>(ENDPOINTS.profiles.titles(userId)),

  follow: (topicId: string, follow: boolean) => (follow ? api.put<void>(ENDPOINTS.topics.follow(topicId)) : api.delete<void>(ENDPOINTS.topics.follow(topicId))),

  /** Porte un titre (`topicId:TIER`), ou retire le titre porté (`null`). */
  wearTitle: (userId: string, titleKey: string | null) => api.put<void>(ENDPOINTS.profiles.title(userId), { titleKey }),
}
