import { createContext } from 'react'
import type { NativeScrollEvent } from 'react-native'
import type { SharedValue } from 'react-native-reanimated'

/** Les listes externes publient leur position au chrome de Screen. Les pagers possèdent leur propre géométrie. */
export const ScrollEdgeContext = createContext<SharedValue<number> | null>(null)

/** Haut ou bas d'un défilement, pour l'haptique de bord (`edge-haptics.ts`). */
export type ScrollEdge = 'top' | 'bottom' | null

/** Tolérance en points : un rebond iOS ou un arrondi de mesure ne compte pas comme un départ du bord. */
const EDGE_SLOP = 1

/** Bord atteint par le défilement, ou `null` au milieu. Pur, appelable depuis un worklet. */
export function scrollEdgeOf(event: Pick<NativeScrollEvent, 'contentOffset' | 'contentSize' | 'layoutMeasurement'> & { contentInset?: { top: number; bottom: number } }): ScrollEdge {
  'worklet'
  const insetTop = event.contentInset?.top ?? 0
  const insetBottom = event.contentInset?.bottom ?? 0
  const y = event.contentOffset.y + insetTop
  const viewport = event.layoutMeasurement.height - insetTop - insetBottom
  const content = event.contentSize.height
  // Page qui ne défile pas : aucun bord à annoncer.
  if (content <= viewport + EDGE_SLOP) return null
  if (y <= EDGE_SLOP) return 'top'
  if (y + viewport >= content - EDGE_SLOP) return 'bottom'
  return null
}

/**
 * Transition d'un bord à l'autre : renvoie le bord **nouvellement** atteint pendant un geste du joueur, sinon `null`.
 * `previous` est le dernier bord vu (mis à jour même hors geste, pour ne pas annoncer un bord déjà occupé).
 */
export function arrivedEdge(previous: ScrollEdge, next: ScrollEdge, userScrolling: boolean): ScrollEdge {
  'worklet'
  if (!userScrolling || next === null || next === previous) return null
  return next
}

