import { useEffect } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { animateTo, useReducedMotion } from '../motion'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export interface PageDotsProps {
  count: number
  /** Position courante, à partir de 0. */
  index: number
  style?: StyleProp<ViewStyle>
}

function Dot({ state }: { state: 'past' | 'current' | 'next' }) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const width = useSharedValue(state === 'current' ? 20 : 6)
  useEffect(() => animateTo(width, state === 'current' ? 20 : 6, 'micro', reduced), [state, reduced, width])
  const animated = useAnimatedStyle(() => ({ width: width.value }))
  const color = { past: colors.muted, current: colors.accent, next: colors.border }[state]
  return <Animated.View style={[{ height: 6, borderRadius: radius.xs, backgroundColor: color }, animated]} />
}

/** Position dans un carrousel ou un parcours : le point courant s'étire en ambre. */
export function PageDots({ count, index, style }: PageDotsProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Étape ${index + 1} sur ${count}`}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] + 2 }, style]}
    >
      {Array.from({ length: count }, (_, dot) => (
        <Dot key={dot} state={dot < index ? 'past' : dot === index ? 'current' : 'next'} />
      ))}
    </View>
  )
}
