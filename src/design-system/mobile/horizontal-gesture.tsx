import { createContext, useContext } from 'react'
import type { SharedValue } from 'react-native-reanimated'

/**
 * Propriété du geste horizontal d'une page à onglets. Un rail (`Rail`) la prend dès le toucher : le pager et le
 * refresh de `TabsScrollView` sont suspendus, et `DragToLoadMore` rend la main. Le geste reste au rail même incliné
 * ou en bout de liste, au lieu de laisser le pager décider de l'angle au premier mouvement.
 */
export interface HorizontalGesture {
  /** Lisible depuis les worklets (`DragToLoadMore`) sans re-rendu. */
  owned: SharedValue<boolean>
  claim: () => void
  release: () => void
}

export const HorizontalGestureContext = createContext<HorizontalGesture | null>(null)

/** Propriété horizontale de la page d'onglets courante, `null` hors de `TabsScrollView`. */
export function useHorizontalGesture() {
  return useContext(HorizontalGestureContext)
}
