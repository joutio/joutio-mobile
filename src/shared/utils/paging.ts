import { useEffect, useState } from 'react'
import type { FeedFooterState, LoadMoreOptions } from '@/design-system'

/** Ce que `FeedFooter` et `DragToLoadMore` lisent d'une liste paginée (`useInfiniteQuery` ou `useClientPages`). */
export interface PagedSource {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  fetchNextPage: () => unknown
  /** Pages affichées (`data.pages.length`). */
  pages: number
  resetKey?: unknown
}

/** Une `useInfiniteQuery` vue comme `PagedSource`. */
export function pagedQuery(query: {
  hasNextPage: boolean
  isFetchingNextPage: boolean
  isFetchNextPageError: boolean
  fetchNextPage: () => unknown
  data?: { pages: unknown[] }
}): PagedSource {
  return {
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    fetchNextPage: query.fetchNextPage,
    pages: query.data?.pages.length ?? 0,
    resetKey: query.data?.pages[0],
  }
}

/** État du pied : erreur de la suite, chargement, suite disponible ou fin. */
export function feedState(source: PagedSource): FeedFooterState {
  return source.isFetchNextPageError ? 'error' : source.isFetchingNextPage ? 'loading' : source.hasNextPage ? 'more' : 'end'
}

/** Props communes de `FeedFooter` (hors libellés). */
export function feedFooterProps(source: PagedSource) {
  return {
    state: feedState(source),
    pages: source.pages,
    onLoadMore: () => source.fetchNextPage(),
    onRetry: () => source.fetchNextPage(),
  }
}

/** Options de `DragToLoadMore` / `loadMore` (écran, feuille). */
export function loadMoreOptions(source: PagedSource): LoadMoreOptions {
  return {
    enabled: source.hasNextPage && !source.isFetchNextPageError,
    resetKey: source.resetKey,
    loading: source.isFetchingNextPage,
    onLoadMore: () => source.fetchNextPage(),
  }
}

/**
 * Pagination locale (liste déjà en mémoire) avec la même forme qu'une `useInfiniteQuery`, pour le même geste. Revient
 * à la première page quand `resetKey` change (recherche, filtre, tri).
 */
export function useClientPages<T>(items: readonly T[], pageSize: number, resetKey?: unknown) {
  const [pages, setPages] = useState(1)
  useEffect(() => setPages(1), [resetKey])
  const visible = items.slice(0, pages * pageSize)
  const source: PagedSource = {
    hasNextPage: visible.length < items.length,
    isFetchingNextPage: false,
    isFetchNextPageError: false,
    fetchNextPage: () => setPages((current) => current + 1),
    pages,
  }
  return { visible, remaining: items.length - visible.length, source }
}

/** Pagination locale déjà tenue par l'écran (`pages`, `setPages`) vue comme `PagedSource`. */
export function clientSource(pages: number, setPages: (update: (current: number) => number) => void, hasNextPage: boolean): PagedSource {
  return { hasNextPage, isFetchingNextPage: false, isFetchNextPageError: false, fetchNextPage: () => setPages((current) => current + 1), pages }
}
