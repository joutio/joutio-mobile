import MaskedView from '@react-native-masked-view/masked-view'
import { useEffect, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { ArrowRightIcon } from '../icons'
import { useReducedMotion } from '../motion'
import { Text } from '../primitives/text'
import { alpha, mix } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'

/** Au-delà, le titre passe en `heroSmall` pour tenir sur deux lignes. */
const LONG_HEADLINE = 12

const bezier = (name: 'base' | 'celebration') => {
  const easing = tokens.motion[name].easing
  return easing.type === 'bezier' ? Easing.bezier(easing.points[0], easing.points[1], easing.points[2], easing.points[3]) : Easing.linear
}

export type HeroMotion = 'celebrate' | 'unroll'

/**
 * Arrivée du héros : `jo-celebrate` (fondu et échelle 0,7 → 1, 700 ms, easing `celebration`) ou `jo-unroll` (le
 * ruban se déroule depuis le centre, `clip-path: inset(0 50%)` → `inset(0)`, 500 ms, easing `base`).
 */
function Hero({ motion, children }: { motion: HeroMotion; children: ReactNode }) {
  const reduced = useReducedMotion()
  const progress = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    const name = motion === 'celebrate' ? 'celebration' : 'base'
    progress.value = withTiming(1, { duration: tokens.motion[name].duration, easing: bezier(name), reduceMotion: ReduceMotion.Never })
  }, [motion, reduced, progress])

  const celebrate = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value), transform: [{ scale: 0.7 + 0.3 * progress.value }] }))
  const unrollMask = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }))
  const unrollFade = useAnimatedStyle(() => ({ opacity: progress.value }))

  if (motion === 'celebrate') return <Animated.View style={celebrate}>{children}</Animated.View>
  return (
    <MaskedView maskElement={<Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, unrollMask]} />}>
      <Animated.View style={unrollFade}>{children}</Animated.View>
    </MaskedView>
  )
}

export interface UnlockContentProps {
  tier: TierCode
  /** Devant le fil : avatar ou icône de famille. */
  crumbLead?: ReactNode
  crumbFrom: string
  hero: ReactNode
  heroMotion: HeroMotion
  eyebrow: string
  headline: string
  text: string
  /** Action secondaire ou son état, sous la phrase. */
  extra?: ReactNode
  next?: { tier: TierCode; preview: ReactNode; rule: string }
}

/** Contenu commun d'un déblocage : halo du rang, fil, héros, titre, texte, action et palier suivant. */
export function UnlockContent({ tier, crumbLead, crumbFrom, hero, heroMotion, eyebrow, headline, text, extra, next }: UnlockContentProps) {
  const { colors, radius } = useTheme()
  const glow = tokens.tier[tier].hex
  const ink = mix(glow, colors.text, 0.6)
  return (
    <View style={{ flexGrow: 1, alignItems: 'center', gap: tokens.space[4], paddingHorizontal: tokens.space[6], paddingTop: tokens.space[5] }}>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 258 - 260,
          alignSelf: 'center',
          width: 520,
          height: 520,
          borderRadius: radius.full,
          experimental_backgroundImage: `radial-gradient(circle, ${alpha(glow, 0.34)}, ${alpha(glow, 0.08)} 45%, transparent 68%)`,
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}>
        {crumbLead}
        <Text variant="caption" weight="600" color="muted">
          {crumbFrom}
        </Text>
        <ArrowRightIcon size={14} color={colors.muted} />
        <Text variant="caption" weight="600" color={ink}>
          {tokens.tier[tier].label}
        </Text>
      </View>
      <View style={{ height: 236, alignItems: 'center', justifyContent: 'center' }}>
        <Hero motion={heroMotion}>{hero}</Hero>
      </View>
      <Text variant="callout" weight="600" color={ink}>
        {eyebrow}
      </Text>
      <Text variant={headline.length > LONG_HEADLINE ? 'heroSmall' : 'hero'} align="center" accessibilityRole="header">
        {headline}
      </Text>
      <Text color="muted" align="center" style={{ maxWidth: 300 }}>
        {text}
      </Text>
      {extra && <View style={{ marginTop: tokens.space[2], minHeight: 32, alignItems: 'center', justifyContent: 'center' }}>{extra}</View>}
      <View style={{ flex: 1 }} />
      {next && (
        <View
          style={{
            alignSelf: 'stretch',
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[4],
            paddingHorizontal: tokens.space[5],
            paddingVertical: tokens.space[4],
            borderRadius: radius.lg,
            backgroundColor: colors.surface,
          }}
        >
          <View style={{ width: 96, height: 56, alignItems: 'center', justifyContent: 'center' }}>{next.preview}</View>
          <Text variant="caption" color="muted" style={{ flex: 1 }}>
            Prochain :{' '}
            <Text variant="caption" weight="600" color={mix(tokens.tier[next.tier].hex, colors.text, 0.6)}>
              {tokens.tier[next.tier].label}
            </Text>{' '}
            {next.rule}
          </Text>
        </View>
      )}
    </View>
  )
}
