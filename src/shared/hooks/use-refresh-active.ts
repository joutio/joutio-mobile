import { useGuardedRefresh } from '@/design-system/mobile/guarded-refresh'

/** Ce qu'un hook de lecture de `@joutio/client` offre au tiré pour rafraîchir. */
interface Refetchable {
  refetch: () => Promise<unknown>
}

/**
 * Tirer pour rafraîchir une page : `refetch` des seules lectures de l'écran (aucune relecture globale du cache).
 * `refresh` sert à `Screen`/`ParallaxScreen`/`CollapsibleTabsScreen` (`onRefresh`) ; `refreshing` et `onRefresh` aux
 * listes (`FlashList`, `FlatList`).
 */
export function useRefreshActive(...queries: Refetchable[]) {
  const refresh = () => Promise.all(queries.map((query) => query.refetch()))
  const { refreshing, refresh: onRefresh } = useGuardedRefresh(refresh)
  return { refresh, refreshing, onRefresh }
}
