import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { HAIRLINE } from '../theme/hairline'

export interface StickyBarProps {
  /** Vrai une fois collée : le filet bas apparaît. Fourni par `useStickyBar`. */
  stuck?: boolean
  onLayout?: (event: LayoutChangeEvent) => void
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/**
 * Barre collée en haut du défilement (`foundations.md` § 10). Natif : enfant direct du ScrollView, son index
 * dans `stickyHeaderIndices`. Le filet n'apparaît qu'une fois collée.
 */
export function StickyBar({ stuck = false, onLayout, style, children }: StickyBarProps) {
  const { colors } = useTheme()
  return (
    <View
      onLayout={onLayout}
      style={[{ backgroundColor: colors.bg, borderBottomWidth: HAIRLINE, borderBottomColor: stuck ? colors.border : 'transparent' }, style]}
    >
      {children}
    </View>
  )
}

/**
 * État collé d'une StickyBar : à brancher sur le ScrollView (`onScroll`, `scrollEventThrottle={16}`) et sur
 * la barre (`bar`). `onStuckChange` prévient l'écran, par exemple pour un titre compact.
 */
export function useStickyBar(onStuckChange?: (stuck: boolean) => void) {
  const offset = useRef(0)
  const [stuck, setStuck] = useState(false)
  const stuckRef = useRef(false)

  const update = useCallback((next: boolean) => {
    if (stuckRef.current === next) return
    stuckRef.current = next
    setStuck(next)
  }, [])

  useEffect(() => onStuckChange?.(stuck), [onStuckChange, stuck])

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => update(event.nativeEvent.contentOffset.y > offset.current), [update])
  // Mesure faite tant que la barre n'est pas collée : collée, sa position suit le défilement.
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    if (!stuckRef.current) offset.current = event.nativeEvent.layout.y
  }, [])

  return { stuck, onScroll, bar: { stuck, onLayout } }
}
