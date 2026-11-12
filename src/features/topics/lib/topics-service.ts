import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { CategoryCode } from '@/design-system'
import type { PageResponse, TopicCardView, TopicFacetsView, TopicSort } from '@joutio/client-domain/api-types'

export const PAGE_SIZE = 20

/** Page en rangées pleines : environ 20 sujets, arrondis au multiple du nombre de colonnes (`sujets.md`). */
export const pageSizeFor = (columns: number) => columns * Math.ceil(PAGE_SIZE / columns)

/** Tri par défaut du catalogue (Sujets, feuille de défi). */
export const DEFAULT_TOPIC_SORT: TopicSort = 'POPULAR'

export interface TopicFilters {
  query: string
  /** Univers choisis ; vide = tous. */
  categories: readonly CategoryCode[]
  sort: TopicSort
  hideFollowed: boolean
  /** Uniquement les sujets suivis (onglet Suivis de l'Accueil) : `GET /api/topics?followed=true`. */
  followed?: boolean
  /** Taille de page envoyée au BFF ; 20 par défaut. */
  size?: number
}

const page = (filters: TopicFilters, category: CategoryCode | undefined, index: number) =>
  api.get<PageResponse<TopicCardView>>(ENDPOINTS.topics.list, {
    params: {
      q: filters.query || undefined,
      category,
      followed: filters.followed || undefined,
      sort: filters.sort,
      page: index,
      size: filters.size ?? PAGE_SIZE,
    },
  })

/** Ordre d'une page fusionnée quand le tri est connu côté client ; sinon on garde l'alternance du serveur. */
const compare: Partial<Record<TopicSort, (a: TopicCardView, b: TopicCardView) => number>> = {
  POPULAR: (a, b) => b.followersCount - a.followersCount,
}

export interface TopicPage {
  topics: TopicCardView[]
  last: boolean
}

export const topicsService = {
  /**
   * Une page du catalogue. **Écarts BFF mockés** (`sujets.md` § 5) : `GET /api/topics` ne prend qu'un univers et ne
   * sait pas exclure les sujets suivis. Plusieurs univers : une requête par univers, fusionnées page par page.
   * « Masquer les sujets suivis » : filtré ici, une page peut donc compter moins de 20 sujets.
   */
  page: async (filters: TopicFilters, index: number): Promise<TopicPage> => {
    const categories = filters.categories.length > 0 ? filters.categories : [undefined]
    const pages = await Promise.all(categories.map((category) => page(filters, category, index)))
    let topics = pages.flatMap((result) => result.content)
    const sorter = compare[filters.sort]
    if (pages.length > 1 && sorter) topics = [...topics].sort(sorter)
    if (filters.hideFollowed) topics = topics.filter((topic) => !topic.followed)
    return { topics, last: pages.every((result) => result.last) }
  },

  facets: (query: string, followed = false): Promise<TopicFacetsView> =>
    api.get<TopicFacetsView>(ENDPOINTS.topics.facets, { params: { q: query || undefined, followed: followed || undefined } }),
}
