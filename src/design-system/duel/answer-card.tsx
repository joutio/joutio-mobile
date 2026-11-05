import { useEffect } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import Svg, { Polygon } from 'react-native-svg'
import { haptic } from '../haptics'
import { CheckCircleIcon, XCircleIcon } from '../icons'
import { PressableScale } from '../primitives/pressable-scale'
import { MAX_FONT_SCALE, Text, typeStyle } from '../primitives/text'
import { useReducedMotion, timing } from '../motion'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export type AnswerState = 'rest' | 'pending' | 'correct' | 'wrong' | 'unchosen' | 'disabled'
export type AnswerNotch = 'none' | 'me' | 'opp' | 'both'

const WHO: Record<AnswerNotch, string> = { none: '', me: ', ton choix', opp: ", choix de l'adversaire", both: ', vos deux choix' }
const MICRO = { ...timing('micro'), reduceMotion: ReduceMotion.Never }

/** Encoche en V : 14 pt de profondeur, 32 pt de haut, centrée sur le bord. */
const NOTCH_DEPTH = 14
const NOTCH_HALF = 16

export interface AnswerCardProps {
  label: string
  state?: AnswerState
  /** Encoche qui indique qui a choisi cette réponse. */
  notch?: AnswerNotch
  /** Points gagnés, affichés avec `details`. */
  gain?: number
  /** Icône de verdict et points à la révélation (réglage du joueur, désactivé par défaut). */
  details?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** Points gagnés sur une réponse : pastille dérivée de la couleur du texte de la carte. */
export function GainTag({ points, color }: { points: number; color: string }) {
  const { radius } = useTheme()
  return (
    <View
      accessible
      accessibilityLabel={`plus ${points} points`}
      style={{ height: 24, paddingHorizontal: tokens.space[3], borderRadius: radius.full, justifyContent: 'center', backgroundColor: alpha(color, 0.15) }}
    >
      <Text variant="caption" weight="700" mono color={color}>
        +{points}
      </Text>
    </View>
  )
}

/** Encoches dessinées en couleur de fond par-dessus la carte (le `clip-path` du lab n'existe pas en natif). */
function Notches({ notch, color }: { notch: AnswerNotch; color: string }) {
  if (notch === 'none') return null
  const left = notch === 'me' || notch === 'both'
  const right = notch === 'opp' || notch === 'both'
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', height: NOTCH_HALF * 2 }}>
        <Svg width={NOTCH_DEPTH} height={NOTCH_HALF * 2} style={{ opacity: left ? 1 : 0 }}>
          <Polygon points={`0,0 ${NOTCH_DEPTH},${NOTCH_HALF} 0,${NOTCH_HALF * 2}`} fill={color} />
        </Svg>
        <Svg width={NOTCH_DEPTH} height={NOTCH_HALF * 2} style={{ opacity: right ? 1 : 0 }}>
          <Polygon points={`${NOTCH_DEPTH},0 0,${NOTCH_HALF} ${NOTCH_DEPTH},${NOTCH_HALF * 2}`} fill={color} />
        </Svg>
      </View>
    </View>
  )
}

/** Réponse d'une manche : touchable au repos, puis figée et colorée à la révélation. */
export function AnswerCard({ label, state = 'rest', notch = state === 'pending' ? 'me' : 'none', gain, details = false, onPress, style }: AnswerCardProps) {
  const { colors, radius } = useTheme()
  const revealed = state === 'correct' || state === 'wrong'
  const showDetails = details && revealed
  const background = {
    rest: colors.raised,
    pending: colors.border,
    correct: colors.correct,
    wrong: colors.wrong,
    unchosen: colors.raised,
    disabled: colors.raised,
  }[state]
  const ink = state === 'correct' ? colors.onCorrect : state === 'wrong' ? colors.onWrong : state === 'unchosen' ? colors.muted : colors.text
  const verdict = state === 'correct' ? ', bonne réponse' : state === 'wrong' ? ', mauvaise réponse' : ''
  const points = showDetails && gain !== undefined ? `, plus ${gain} points` : ''
  const MarkIcon = state === 'correct' ? CheckCircleIcon : XCircleIcon
  const opacity = state === 'disabled' ? 0.4 : 1

  // `.jo-transition` du lab : fond, couleur du texte et opacité passent en 200 ms (easing `micro`) au verdict.
  const reduced = useReducedMotion()
  const fill = useSharedValue(background)
  const text = useSharedValue(ink)
  const fade = useSharedValue(opacity)
  useEffect(() => {
    const go = <T extends string | number>(target: T) => (reduced ? target : withTiming(target, MICRO))
    fill.value = go(background)
    text.value = go(ink)
    fade.value = go(opacity)
  }, [background, ink, opacity, reduced, fill, text, fade])
  const surface = useAnimatedStyle(() => ({ backgroundColor: fill.value, opacity: fade.value }))
  const labelColor = useAnimatedStyle(() => ({ color: text.value, opacity: fade.value }))

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}${WHO[notch]}${verdict}${points}`}
      accessibilityState={{ disabled: state !== 'rest' }}
      disabled={state !== 'rest'}
      pressedScale={0.98}
      onPress={() => {
        haptic('selection')
        onPress?.()
      }}
      style={[
        {
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.space[3],
          paddingHorizontal: showDetails ? tokens.space[5] : tokens.space[6],
          paddingVertical: tokens.space[3],
          borderRadius: radius.sm,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, surface]} />
      {showDetails && <MarkIcon size={18} weight="fill" color={ink} />}
      <Animated.Text maxFontSizeMultiplier={MAX_FONT_SCALE} style={[typeStyle('headline'), { flexShrink: 1, textAlign: 'center' }, labelColor]}>
        {label}
      </Animated.Text>
      {showDetails && gain !== undefined && <GainTag points={gain} color={ink} />}
      <Notches notch={notch} color={colors.bg} />
    </PressableScale>
  )
}
