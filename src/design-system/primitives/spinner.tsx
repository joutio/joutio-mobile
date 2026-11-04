import { useEffect } from 'react'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { CircleNotchIcon } from '../icons'
import { loop, useReducedMotion } from '../motion'

/** `jo-spin` : 800 ms par tour, fixe sous mouvement réduit. */
export function Spinner({ size, color }: { size: number; color: string }) {
  const reduced = useReducedMotion()
  const turn = useSharedValue(0)
  useEffect(() => loop(turn, 360, 800, reduced), [reduced, turn])
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.value}deg` }] }))
  return (
    <Animated.View style={style} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <CircleNotchIcon size={size} color={color} />
    </Animated.View>
  )
}
