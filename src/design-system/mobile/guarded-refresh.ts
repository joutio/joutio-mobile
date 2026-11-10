import { useRef, useState } from 'react'
import { haptic } from '../haptics'

/**
 * Pull-to-refresh : l'unique implémentation (verrou anti-doublon + retour haptique + `refreshing`).
 * Règle : tout geste de rafraîchissement vibre (`haptic('light')`) une seule fois, après le verrou.
 * Aucun écran ne pose son propre `RefreshControl`/verrou : il passe par `Screen`, `ParallaxScreen`,
 * `CollapsibleTabsScreen` ou ce hook (garde-fou : `tests/refresh-haptic.test.cjs`).
 */
export function useGuardedRefresh(onRefresh?: () => Promise<unknown> | void) {
  const busy = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const refresh = () => {
    if (!onRefresh || busy.current) return
    busy.current = true
    // Le natif ne vibre pas (et Android ne remonte pas la traction) : le retour haptique marque le déclenchement.
    haptic('light')
    setRefreshing(true)
    Promise.resolve()
      .then(onRefresh)
      .catch(() => undefined)
      .finally(() => {
        busy.current = false
        setRefreshing(false)
      })
  }
  return { refreshing, refresh }
}
