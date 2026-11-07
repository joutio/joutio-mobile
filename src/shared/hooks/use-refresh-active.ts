import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

/**
 * Tirer pour rafraîchir une page entière (2026-11-07) : recharge toutes les requêtes affichées, pas seulement l'en-tête.
 * `refresh` sert à `Screen`/`ParallaxScreen`/`CollapsibleTabsScreen` (`onRefresh`) ; `refreshing` et `onRefresh` aux
 * listes (`FlashList`, `FlatList`).
 */
export function useRefreshActive() {
  const client = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const refresh = useCallback(() => client.refetchQueries({ type: 'active' }), [client])
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void refresh().finally(() => setRefreshing(false))
  }, [refresh])
  return { refresh, refreshing, onRefresh }
}
