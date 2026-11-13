import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { topicsService, type TopicFilters, type TopicScope } from '../lib/topics-service'

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

/** Univers présents pour une recherche, et leurs effectifs (compteur, puces), dans la portée « Mes thèmes ». */
export function useTopicFacets(query: string, scope: TopicScope | boolean = 'ALL') {
  // `true` : sujets suivis (onglet Suivis de l'Accueil).
  const resolved: TopicScope = scope === true ? 'FOLLOWED' : scope === false ? 'ALL' : scope
  return useQuery({
    queryKey: [...queryKeys.topics.facets(query), { scope: resolved }],
    queryFn: () => topicsService.facets(query, resolved),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  })
}
