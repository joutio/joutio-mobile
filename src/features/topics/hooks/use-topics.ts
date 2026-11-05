import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { topicsService, type TopicFilters } from '../lib/topics-service'

/** Catalogue paginé : une recherche ou un filtre repart de la première page. */
export function useTopics(filters: TopicFilters, enabled = true) {
  return useInfiniteQuery({
    enabled,
    queryKey: queryKeys.topics.list(filters),
    queryFn: ({ pageParam }) => topicsService.page(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.last ? undefined : pages.length),
    // Changer de filtre garde la grille affichée jusqu'à l'arrivée des nouveaux résultats : pas de flash de squelettes.
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}

/** Univers présents pour une recherche, et leurs effectifs (compteur, puces). */
export function useTopicFacets(query: string, followed = false) {
  return useQuery({
    queryKey: [...queryKeys.topics.facets(query), { followed }],
    queryFn: () => topicsService.facets(query, followed),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
