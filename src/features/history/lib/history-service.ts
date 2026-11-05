import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { GameHistoryItemView, PageResponse } from '@/shared/types/bff'

/** 20 parties par page (`historique.md` § 5). */
export const HISTORY_PAGE_SIZE = 20

export type HistoryOpponentType = 'HUMAN' | 'BOT'
export type HistoryOutcome = 'ALL' | 'WIN' | 'LOSS' | 'DRAW'
export type HistorySort = 'RECENT' | 'OLDEST'

export interface HistoryFilters {
  topicId?: string
  opponentId?: string
  opponentType?: HistoryOpponentType
  outcome: HistoryOutcome
  sort: HistorySort
}

export type HistoryFilterState = Pick<HistoryFilters, 'opponentType' | 'outcome' | 'sort'>

export const DEFAULT_HISTORY_FILTERS: HistoryFilterState = {
  outcome: 'ALL',
  sort: 'RECENT',
}

/** Mes parties (ou celles d'un joueur), filtrées et paginées. */
export const historyService = {
  page: (userId: string, filters: HistoryFilters, page: number) =>
    api.get<PageResponse<GameHistoryItemView>>(ENDPOINTS.profiles.games(userId), {
      params: {
        topicId: filters.topicId,
        opponentId: filters.opponentId,
        opponentType: filters.opponentType,
        outcome: filters.outcome,
        sort: filters.sort,
        page,
        size: HISTORY_PAGE_SIZE,
      },
    }),
}
