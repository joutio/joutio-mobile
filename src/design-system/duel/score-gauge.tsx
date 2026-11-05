import { useEffect } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { useReducedMotion } from '../motion'
import { useTheme } from '../theme/theme-provider'

export interface ScoreGaugeProps {
  value: number
  /** Score maximal de la partie. */
  max: number
  state?: 'rest' | 'correct' | 'wrong'
  label?: string
  style?: StyleProp<ViewStyle>
}

/** Révélation d'un score : montée linéaire de 900 ms, solidaire du compteur (`SCORE_REVEAL_MS`). */
const REVEAL_MS = 900

/** Jauge verticale de score : prend toute la hauteur de son parent. */
export function ScoreGauge({ value, max, state = 'rest', label = 'Score', style }: ScoreGaugeProps) {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  const bounded = Math.min(max, Math.max(0, value))
  const height = useSharedValue(bounded / max)

  useEffect(() => {
    height.value = reduced ? bounded / max : withTiming(bounded / max, { duration: REVEAL_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never })
  }, [bounded, max, reduced, height])

  const fill = useAnimatedStyle(() => ({ transform: [{ scaleY: height.value }] }))
  const color = state === 'correct' ? colors.correct : state === 'wrong' ? colors.wrong : colors.accent
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: bounded }}
      style={[{ width: 8, height: '100%', overflow: 'hidden' }, style]}
    >
      <Animated.View style={[{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, transformOrigin: 'bottom', backgroundColor: color }, fill]} />
    </View>
  )
}
