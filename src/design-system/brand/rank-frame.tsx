import { Image, type ImageSource } from 'expo-image'
import { useEffect, type ReactNode } from 'react'
import { View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { loop, useReducedMotion } from '../motion'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { FRAME_ASSETS } from './frame-assets'

interface FrameLayers {
  /** Marge du contenu dans son cadre, en fraction de la taille. */
  inset: number
  spin?: number
  counter?: number
  pulse?: boolean
}

// Valeurs identiques au lab (`design/src/design-system/brand/rank-frame.tsx`).
const FRAMES: Record<TierCode, FrameLayers> = {
  FER: { inset: 0.05 },
  BRONZE: { inset: 0.075 },
  ARGENT: { inset: 0.08 },
  OR: { inset: 0.085 },
  PLATINE: { inset: 0.09, spin: 5000 },
  EMERAUDE: { inset: 0.095, spin: 4500 },
  DIAMANT: { inset: 0.1, spin: 7000, counter: 3500, pulse: true },
}

/** Le canevas des cadres vaut 144 % de l'avatar, pour contenir le halo. */
const OVERFLOW = 0.22

function Layer({
  source,
  size,
  duration,
  reverse = false,
  pulse = false,
}: {
  source: ImageSourcePropType
  size: number
  duration?: number
  reverse?: boolean
  pulse?: boolean
}) {
  const reduced = useReducedMotion()
  const turn = useSharedValue(0)
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (duration) loop(turn, reverse ? -360 : 360, duration, reduced)
    return () => cancelAnimation(turn)
  }, [duration, reverse, reduced, turn])

  // `jo-frame-pulse` : 0.55 ↔ 1, 2,4 s, ease-in-out.
  useEffect(() => {
    cancelAnimation(opacity)
    opacity.value = 1
    if (!pulse || reduced) return
    opacity.value = 0.55
    opacity.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.Never }), -1, true)
  }, [pulse, reduced, opacity])

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ rotate: `${turn.value}deg` }] }))
  const extent = size * (1 + 2 * OVERFLOW)
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: -size * OVERFLOW, top: -size * OVERFLOW, width: extent, height: extent }, animated]}
    >
      <Image source={source as ImageSource} style={{ width: extent, height: extent }} contentFit="contain" />
    </Animated.View>
  )
}

export interface RankFrameProps {
  tier: TierCode
  /** Largeur de l'avatar en pt, hors halo. */
  size: number
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/** Cadre Elo : se gagne en duel classé, de l'anneau plein du Fer à l'irisé du Diamant. */
export function RankFrame({ tier, size, style, children }: RankFrameProps) {
  const { radius } = useTheme()
  const { inset, spin, counter, pulse } = FRAMES[tier]
  const layers = tier === 'FER' ? null : FRAME_ASSETS[tier]
  const margin = size * inset

  return (
    <View style={[{ width: size, height: size }, style]}>
      {layers === null ? (
        <View style={{ position: 'absolute', inset: 0, borderRadius: radius.full, backgroundColor: tokens.tier.FER.hex }} />
      ) : (
        <>
          {pulse && layers.halo && <Layer source={layers.halo} size={size} pulse />}
          <Layer source={layers.base} size={size} />
          {spin && layers.spin && <Layer source={layers.spin} size={size} duration={spin} />}
          {counter && layers.counter && <Layer source={layers.counter} size={size} duration={counter} reverse />}
        </>
      )}
      <View style={{ position: 'absolute', inset: margin, borderRadius: radius.full, overflow: 'hidden' }}>{children}</View>
    </View>
  )
}
