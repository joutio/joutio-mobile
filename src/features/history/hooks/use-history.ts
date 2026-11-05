import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { HISTORY_PAGE_SIZE, historyService, type HistoryFilters } from '../lib/history-service'

/** Historique paginé ; changer un filtre repart de la première page et garde l'ancienne liste jusqu'au résultat. */
export function useHistoryGames(userId: string, filters: HistoryFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.profiles.games(userId, filters),
    queryFn: ({ pageParam }) => historyService.page(userId, filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.last ? undefined : pages.length),
    enabled: enabled && Boolean(userId),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    meta: { pageSize: HISTORY_PAGE_SIZE },
  })
}
