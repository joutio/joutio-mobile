import { Children, useRef, type ReactNode } from 'react'
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native'
import { tokens } from '../tokens.generated'
import { useHorizontalGesture } from './horizontal-gesture'

export interface RailProps {
  /** Largeur de chaque élément en pt, ou par index quand elles diffèrent. */
  itemWidth: number | ((index: number) => number)
  /** Nom accessible de la liste. */
  label?: string
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

const GAP = tokens.space[4]
const GUTTER = tokens.space[5]

/**
 * Rangée horizontale de cartes (`navigation.md`) : défilement **libre** sans barre (inertie native, sans aimantation,
 * 2026-11-05), marges de 16 pt, écart de 12 pt.
 */
export function Rail({ itemWidth, label, style, children }: RailProps) {
  const items = Children.toArray(children)
  const widthOf = (index: number) => (typeof itemWidth === 'function' ? itemWidth(index) : itemWidth)
  // Tant que le doigt est sur le rail, le pager et le refresh de la page sont suspendus : un swipe incliné ou un
  // geste en bout de liste ne change pas d'onglet et ne déclenche pas le refresh.
  const gesture = useHorizontalGesture()
  const claimed = useRef(false)
  const claim = () => {
    if (!gesture || claimed.current) return
    claimed.current = true
    gesture.claim()
  }
  const release = () => {
    if (!gesture || !claimed.current) return
    claimed.current = false
    gesture.release()
  }

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      // iOS : seul le défilement principal de l'écran répond au toucher de la barre d'état.
      scrollsToTop={false}
      accessibilityLabel={label}
      accessibilityRole="list"
      showsHorizontalScrollIndicator={false}
      onTouchStart={claim}
      onTouchEnd={release}
      onTouchCancel={release}
      onScrollBeginDrag={claim}
      onScrollEndDrag={release}
      onMomentumScrollEnd={release}
      style={style}
      contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GAP }}
    >
      {items.map((child, index) => (
        <View key={index} style={{ width: widthOf(index) }}>
          {child}
        </View>
      ))}
    </ScrollView>
  )
}
