import { useCatalogue, useFacets, type CatalogueFilters, type TopicScope } from '@joutio/client/topics'

/** Catalogue paginé : une recherche ou un filtre repart de la première page, la grille précédente reste affichée. */
export const useTopics = (filters: CatalogueFilters) => useCatalogue(filters)

/** Univers présents pour une recherche, et leurs effectifs (compteur, puces), dans la portée « Mes thèmes ». */
export function useTopicFacets(query: string, scope: TopicScope | boolean = 'ALL') {
  // `true` : sujets suivis (onglet Suivis de l'Accueil).
  return useFacets(query, scope === true ? 'FOLLOWED' : scope === false ? 'ALL' : scope)
}
