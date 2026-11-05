import { StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle } from 'react-native-reanimated'
import { CategoryIcon } from '../brand/category-icon'
import { LightningIcon } from '../icons'
import { useReducedMotion } from '../motion'
import { Text } from '../primitives/text'
import { ForceDark, useTheme } from '../theme/theme-provider'
import { keyframe, useTimeline } from '../timeline'
import { tokens, type CategoryCode } from '../tokens.generated'
import { RoundDots, type RoundResult } from './round-dots'

export interface RoundIntroProps {
  round: number
  total: number
  topic: string
  category: CategoryCode
  results: readonly RoundResult[]
  /** Manche à points doublés. */
  bonus?: boolean
  animated?: boolean
  duration?: number
  elapsedMs?: number
  onComplete?: () => void
}

function Body({ round, total, topic, category, results, bonus = false, animated = false, duration = 1900, elapsedMs, onComplete }: RoundIntroProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const t = useTimeline({ duration, elapsedMs, animated: animated && !reduced, held: 0.5, onComplete })

  // Bandeau : s'ouvre depuis la gauche, tient, se referme vers la droite (`clip-path: inset` du lab).
  const band = useAnimatedStyle(() => {
    const open = keyframe(t.value, [
      [0, 0],
      [0.14, 1],
    ])
    const close = keyframe(t.value, [
      [0.82, 0],
      [0.96, 1],
    ])
    return { transform: [{ scaleX: open - close }], transformOrigin: close > 0 ? 'right' : 'left' }
  })
  const number = useAnimatedStyle(() => ({
    opacity: keyframe(t.value, [
      [0.06, 0],
      [0.2, 1],
      [0.8, 1],
      [0.92, 0],
    ]),
    transform: [
      {
        translateX: keyframe(t.value, [
          [0.06, -48],
          [0.2, 0],
          [0.8, 0],
          [0.92, 48],
        ]),
      },
    ],
  }))
  const word = useAnimatedStyle(() => ({
    opacity: keyframe(t.value, [
      [0.1, 0],
      [0.24, 1],
      [0.78, 1],
      [0.9, 0],
    ]),
    transform: [
      {
        translateX: keyframe(t.value, [
          [0.1, -32],
          [0.24, 0],
          [0.78, 0],
          [0.9, 32],
        ]),
      },
    ],
  }))
  const rise = useAnimatedStyle(() => ({
    opacity: keyframe(t.value, [
      [0.12, 0],
      [0.24, 1],
      [0.8, 1],
      [0.9, 0],
    ]),
    transform: [
      {
        translateY: keyframe(t.value, [
          [0.12, 8],
          [0.24, 0],
          [0.8, 0],
          [0.9, -8],
        ]),
      },
    ],
  }))

  return (
    <View
      accessible
      accessibilityLabel={`Manche ${round} sur ${total}${bonus ? ', question bonus, points doublés' : ''}`}
      style={[StyleSheet.absoluteFill, { justifyContent: 'center', gap: tokens.space[6], backgroundColor: colors.bg }]}
    >
      <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space[3] }, rise]}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.sm,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.category[category].color,
          }}
        >
          <CategoryIcon category={category} size={14} weight="fill" color={colors.onAccent} />
        </View>
        <Text variant="callout" weight="600" color="muted">
          {topic}
        </Text>
      </Animated.View>
      <View style={{ height: 136, justifyContent: 'center' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.accent }, band]} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: tokens.space[5] }}>
          <Animated.View style={number}>
            <Text variant="numericGiant" color="onAccent">
              {round}
            </Text>
          </Animated.View>
          <Animated.View style={word}>
            <Text variant="title2" weight="700" color="onAccent">
              Manche
            </Text>
            <Text variant="callout" weight="600" color="onAccent" style={{ opacity: 0.7 }}>
              de {total}
            </Text>
          </Animated.View>
        </View>
      </View>
      <Animated.View style={[{ alignItems: 'center', gap: tokens.space[4] }, rise]}>
        <RoundDots results={results} size={12} />
        {/* Place réservée : le bandeau ne bouge pas d'une manche normale à la manche bonus. */}
        <View style={{ height: 32 }}>
          {bonus && (
            <View
              style={{
                height: 32,
                flexDirection: 'row',
                alignItems: 'center',
                gap: tokens.space[3],
                paddingHorizontal: tokens.space[5],
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: colors.accent,
                backgroundColor: colors.warm,
              }}
            >
              <LightningIcon size={16} weight="fill" color={colors.accentInk} />
              <Text variant="callout" weight="700" color="accentInk">
                Question bonus · points doublés
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  )
}

/** Annonce plein écran d'une manche. Toujours sombre. */
export function RoundIntro(props: RoundIntroProps) {
  return (
    <ForceDark>
      <Body {...props} />
    </ForceDark>
  )
}
