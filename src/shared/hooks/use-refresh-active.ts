import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useGuardedRefresh } from '@/design-system/mobile/guarded-refresh'

/**
 * Tirer pour rafraîchir une page entière (2026-11-07) : recharge toutes les requêtes affichées, pas seulement l'en-tête.
 * `refresh` sert à `Screen`/`ParallaxScreen`/`CollapsibleTabsScreen` (`onRefresh`) ; `refreshing` et `onRefresh` aux
 * listes (`FlashList`, `FlatList`).
 */
export function useRefreshActive() {
  const client = useQueryClient()
  const refresh = useCallback(() => client.refetchQueries({ type: 'active' }), [client])
  const { refreshing, refresh: onRefresh } = useGuardedRefresh(refresh)
  return { refresh, refreshing, onRefresh }
}
