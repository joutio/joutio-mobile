import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { topicsService, type TopicFilters } from '../lib/topics-service'

/** Catalogue paginé : une recherche ou un filtre repart de la première page. */
export function useTopics(filters: TopicFilters) {
  return useInfiniteQuery({
    queryKey: queryKeys.topics.list(filters),
    queryFn: ({ pageParam }) => topicsService.page(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.last ? undefined : pages.length),
    staleTime: 60_000,
  })
}

/** Univers présents pour une recherche, et leurs effectifs (compteur, puces). */
export function useTopicFacets(query: string) {
  return useQuery({
    queryKey: queryKeys.topics.facets(query),
    queryFn: () => topicsService.facets(query),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
