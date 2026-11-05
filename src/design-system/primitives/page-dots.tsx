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

const DOT = 6
const LONG = 20
const GAP = tokens.space[2] + 2
const STRETCH = LONG - DOT

/** Abscisse d'un point : ceux qui suivent le point courant sont décalés de son étirement. */
const offsetOf = (dot: number, index: number) => dot * (DOT + GAP) + (dot > index ? STRETCH : 0)

/**
 * Un point, en transformations seules (jamais `width` à chaque frame) : deux extrémités rondes et un centre qui
 * s'étire en `scaleX` depuis la gauche, l'ensemble glissant en `translateX`.
 */
function Dot({ dot, index }: { dot: number; index: number }) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const state = dot < index ? 'past' : dot === index ? 'current' : 'next'
  const x = useSharedValue(offsetOf(dot, index))
  const stretch = useSharedValue(state === 'current' ? 1 : 0)
  useEffect(() => animateTo(x, offsetOf(dot, index), 'micro', reduced), [dot, index, reduced, x])
  useEffect(() => animateTo(stretch, state === 'current' ? 1 : 0, 'micro', reduced), [state, reduced, stretch])
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))
  const middle = useAnimatedStyle(() => ({ transform: [{ scaleX: stretch.value }] }))
  const end = useAnimatedStyle(() => ({ transform: [{ translateX: stretch.value * STRETCH }] }))
  const color = { past: colors.muted, current: colors.accent, next: colors.border }[state]
  const cap = { position: 'absolute', top: 0, left: 0, width: DOT, height: DOT, borderRadius: radius.xs, backgroundColor: color } as const
  return (
    <Animated.View style={[{ position: 'absolute', top: 0, left: 0, width: LONG, height: DOT }, slide]}>
      <View style={cap} />
      <Animated.View
        style={[{ position: 'absolute', top: 0, left: DOT / 2, width: STRETCH, height: DOT, backgroundColor: color, transformOrigin: 'left' }, middle]}
      />
      <Animated.View style={[cap, end]} />
    </Animated.View>
  )
}

/** Position dans un carrousel ou un parcours : le point courant s'étire en ambre. */
export function PageDots({ count, index, style }: PageDotsProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Étape ${index + 1} sur ${count}`}
      style={[{ width: Math.max(0, count - 1) * (DOT + GAP) + LONG, height: DOT }, style]}
    >
      {Array.from({ length: count }, (_, dot) => (
        <Dot key={dot} dot={dot} index={index} />
      ))}
    </View>
  )
}
