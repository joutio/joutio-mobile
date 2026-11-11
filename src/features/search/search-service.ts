import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { SuggestionView } from '@joutio/client-domain/api-types'

export const SEARCH_LIMIT = 10

/** Recherche globale (`recherche.md` § 3) : sujets et joueurs d'une même requête. */
export const searchService = {
  suggestions: (query: string) => api.get<SuggestionView[]>(ENDPOINTS.suggestions, { params: { q: query, limit: SEARCH_LIMIT } }),
}
