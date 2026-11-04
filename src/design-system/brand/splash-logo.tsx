import { useEffect } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import LogoMark from '../../../assets/brand/logo-mark.svg'
import { useReducedMotion } from '../motion'
import { Text, typeStyle } from '../primitives/text'
import { tokens } from '../tokens.generated'

export interface SplashLogoProps {
  /** `launch` au démarrage de l'app, `loading` entre deux pages au-delà de 400 ms. */
  variant?: 'launch' | 'loading'
  style?: StyleProp<ViewStyle>
}

/** Logo du lancement ; en `loading`, il respire (`jo-breathe` : 1,6 s, .92 et .6). */
export function SplashLogo({ variant = 'launch', style }: SplashLogoProps) {
  const launch = variant === 'launch'
  const reduced = useReducedMotion()
  const breath = useSharedValue(0)

  useEffect(() => {
    cancelAnimation(breath)
    breath.value = 0
    if (launch || reduced) return
    breath.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.bezier(0.4, 0, 0.6, 1), reduceMotion: ReduceMotion.Never }), -1, true)
  }, [launch, reduced, breath])

  const animated = useAnimatedStyle(() => ({ opacity: 1 - breath.value * 0.4, transform: [{ scale: 1 - breath.value * 0.08 }] }))
  const size = launch ? 96 : 64
  const word = typeStyle(launch ? 'largeTitle' : 'title2')

  return (
    <View
      accessible
      accessibilityRole={launch ? 'image' : 'progressbar'}
      accessibilityLabel={launch ? 'Joutio' : 'Chargement'}
      style={[{ alignItems: 'center', gap: launch ? tokens.space[5] : tokens.space[4] }, style]}
    >
      <Animated.View style={animated}>
        <LogoMark width={size} height={size} />
      </Animated.View>
      <Text style={[word, { letterSpacing: -(word.fontSize ?? 0) * 0.05 }]}>joutio</Text>
    </View>
  )
}
