import { Children, type ReactNode } from 'react'
import { ScrollView, View, type StyleProp, type ViewStyle } from 'react-native'
import { tokens } from '../tokens.generated'

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

  return (
    <ScrollView
      horizontal
      // iOS : seul le défilement principal de l'écran répond au toucher de la barre d'état.
      scrollsToTop={false}
      accessibilityLabel={label}
      accessibilityRole="list"
      showsHorizontalScrollIndicator={false}
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
