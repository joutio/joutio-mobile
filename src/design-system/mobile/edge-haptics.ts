import { createContext, useContext, useMemo, useRef } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps } from 'react-native'
import { haptic } from '../haptics'
import { arrivedEdge, scrollEdgeOf, type ScrollEdge } from './scroll-edge'

/**
 * Haptique de bord (2026-11-13) : un retour léger quand le joueur **amène** une page en haut ou en bas en la faisant
 * défiler (doigt ou inertie qui suit). Jamais au montage, au retour en haut programmé (onglet, barre d'état) ni sur une
 * page trop courte pour défiler ; une fois par arrivée, le retour suivant attend que la page ait quitté ce bord.
 */
type Handlers = Pick<ScrollViewProps, 'onScroll' | 'onScrollBeginDrag' | 'onScrollEndDrag' | 'onMomentumScrollEnd'>

/** Un défilement englobant (page d'onglet) a déjà posé l'haptique : les défilements internes ne la doublent pas. */
export const EdgeHapticsClaimed = createContext(false)

/**
 * Gestionnaires à étaler sur un `ScrollView` (ou une liste) : ils composent ceux reçus en `props`. Inactifs si un
 * défilement englobant a réclamé l'haptique (`EdgeHapticsClaimed`) ou si `enabled` est faux.
 */
export function useEdgeHaptics(props: Handlers, enabled = true): Handlers {
  const claimed = useContext(EdgeHapticsClaimed)
  const state = useRef<{ edge: ScrollEdge; scrolling: boolean }>({ edge: 'top', scrolling: false })
  const latest = useRef(props)
  latest.current = props
  const active = enabled && !claimed
  return useMemo<Handlers>(() => {
    if (!active) return props
    return {
      onScrollBeginDrag: (event) => {
        state.current.scrolling = true
        latest.current.onScrollBeginDrag?.(event)
      },
      onScrollEndDrag: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        // Relâché sans élan : le geste s'arrête là ; avec élan, l'inertie qui suit compte encore.
        const velocity = event.nativeEvent.velocity?.y ?? 0
        if (Math.abs(velocity) < 0.01) state.current.scrolling = false
        latest.current.onScrollEndDrag?.(event)
      },
      onMomentumScrollEnd: (event) => {
        state.current.scrolling = false
        latest.current.onMomentumScrollEnd?.(event)
      },
      onScroll: (event) => {
        const next = scrollEdgeOf(event.nativeEvent)
        if (arrivedEdge(state.current.edge, next, state.current.scrolling)) haptic('light')
        state.current.edge = next
        latest.current.onScroll?.(event)
      },
    }
    // Les gestionnaires reçus sont relus à l'appel (`latest`) : seule leur présence compte ici.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}

export { arrivedEdge, scrollEdgeOf, type ScrollEdge }
