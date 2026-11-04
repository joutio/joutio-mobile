import { useEffect } from 'react'
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { useReducedMotion } from '../motion'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

type SkeletonShape = 'text' | 'row' | 'card' | 'circle'

export interface SkeletonProps {
  shape?: SkeletonShape
  /** Largeur. Par défaut, toute la largeur disponible. */
  width?: DimensionValue
  /** `false` hors connexion : squelette fixe, sans pulsation. */
  animated?: boolean
  style?: StyleProp<ViewStyle>
}

const [x1, y1, x2, y2] = tokens.motion.base.easing.type === 'bezier' ? tokens.motion.base.easing.points : [0, 0, 1, 1]

/** Garde la forme de la page pendant le chargement. Toujours préféré à un spinner. */
export function Skeleton({ shape = 'text', width, animated = true, style }: SkeletonProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const opacity = useSharedValue(1)

  // `jo-pulse` : 0.55 → 1, 1 400 ms, aller-retour.
  useEffect(() => {
    cancelAnimation(opacity)
    opacity.value = 1
    if (!animated || reduced) return
    opacity.value = 0.55
    opacity.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.bezier(x1, y1, x2, y2), reduceMotion: ReduceMotion.Never }), -1, true)
  }, [animated, reduced, opacity])

  const pulse = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const shapes: Record<SkeletonShape, ViewStyle> = {
    text: { height: 16, borderRadius: radius.xs },
    row: { height: 44, borderRadius: radius.sm },
    card: { height: 180, borderRadius: radius.lg },
    circle: { aspectRatio: 1, borderRadius: radius.full },
  }
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[{ backgroundColor: colors.raised, width: width ?? '100%' }, shapes[shape], pulse, style]}
    />
  )
}
