import MaskedView from '@react-native-masked-view/masked-view'
import { createContext, useContext, useEffect, type ReactNode } from 'react'
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

/**
 * Page de la séquence au premier plan : dans le pager, les déblocages voisins sont montés d'avance, leur héros n'entre
 * qu'à l'arrivée sur leur page (et rejoue s'il y revient). Hors séquence, toujours actif.
 */
export const UnlockActiveContext = createContext(true)

export type HeroMotion = 'celebrate' | 'unroll' | 'drop' | 'ignite'

/**
 * Arrivée du héros : `jo-celebrate` (fondu et échelle 0,7 → 1, 700 ms, easing `celebration`) ou `jo-unroll` (le
 * ruban se déroule depuis le centre, `clip-path: inset(0 50%)` → `inset(0)`, 500 ms, easing `base`) ou `jo-drop` (le
 * badge tombe de 96 px en fondu et ressort, 700 ms, easing `celebration`) ou `jo-ignite` (la flamme s'allume :
 * échelle 0,4 → 1 depuis le bas en remontant de 24 px, fondu sur les 60 premiers %, 700 ms, easing `celebration`).
 */
function Hero({ motion, children }: { motion: HeroMotion; children: ReactNode }) {
  const reduced = useReducedMotion()
  const active = useContext(UnlockActiveContext)
  const progress = useSharedValue(reduced ? 1 : 0)
  useEffect(() => {
    if (reduced) return
    if (!active) {
      progress.value = 0
      return
    }
    const name = motion === 'unroll' ? 'base' : 'celebration'
    progress.value = withTiming(1, { duration: tokens.motion[name].duration, easing: bezier(name), reduceMotion: ReduceMotion.Never })
  }, [motion, reduced, progress, active])

  const celebrate = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value), transform: [{ scale: 0.7 + 0.3 * progress.value }] }))
  const drop = useAnimatedStyle(() => ({ opacity: Math.min(1, progress.value), transform: [{ translateY: -96 * (1 - progress.value) }] }))
  const ignite = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value / 0.6),
    transform: [{ translateY: 24 * (1 - progress.value) }, { scale: 0.4 + 0.6 * progress.value }],
  }))
  const unrollMask = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }))
  const unrollFade = useAnimatedStyle(() => ({ opacity: progress.value }))

  if (motion === 'celebrate') return <Animated.View style={celebrate}>{children}</Animated.View>
  if (motion === 'drop') return <Animated.View style={drop}>{children}</Animated.View>
  if (motion === 'ignite') return <Animated.View style={[ignite, { transformOrigin: '50% 80%' }]}>{children}</Animated.View>
  return (
    <MaskedView maskElement={<Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, unrollMask]} />}>
      <Animated.View style={unrollFade}>{children}</Animated.View>
    </MaskedView>
  )
}

/** Couleur d'un déblocage sans rang (série) : halo, fil et mot d'appel. */
export interface UnlockAccent {
  glow: string
  ink: string
  label: string
}

export interface UnlockContentProps {
  /** Rang du déblocage ; sans rang, `accent` donne la couleur et le bout du fil. */
  tier?: TierCode
  accent?: UnlockAccent
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
  /** Palier suivant : `tier` (son nom en couleur), ou `label` libre pour un déblocage sans rang. */
  next?: { tier?: TierCode; label?: string; preview: ReactNode; rule: string }
}

/** Contenu commun d'un déblocage : halo du rang, fil, héros, titre, texte, action et palier suivant. */
export function UnlockContent({ tier, accent, crumbLead, crumbFrom, hero, heroMotion, eyebrow, headline, text, extra, next }: UnlockContentProps) {
  const { colors, radius } = useTheme()
  const glow = tier ? tokens.tier[tier].hex : (accent?.glow ?? colors.accent)
  const ink = tier ? mix(glow, colors.text, 0.6) : (accent?.ink ?? colors.accentInk)
  const crumbTo = tier ? tokens.tier[tier].label : (accent?.label ?? '')
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
          {crumbTo}
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
            <Text variant="caption" weight="600" color={next.tier ? mix(tokens.tier[next.tier].hex, colors.text, 0.6) : ink}>
              {next.tier ? tokens.tier[next.tier].label : next.label}
            </Text>{' '}
            {next.rule}
          </Text>
        </View>
      )}
    </View>
  )
}
