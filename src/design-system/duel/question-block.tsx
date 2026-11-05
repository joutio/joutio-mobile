import { Image } from 'expo-image'
import { useEffect, useState, type ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, Keyframe, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import { useReducedMotion } from '../motion'
import { Text } from '../primitives/text'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { AnswerCard, type AnswerCardProps } from './answer-card'

/** Écart entre deux réponses qui apparaissent (`--jo-answer-stagger`). */
const STAGGER_MS = 120
const BASE_MS = tokens.motion.base.duration
const [X1, Y1, X2, Y2] = tokens.motion.base.easing.type === 'bezier' ? tokens.motion.base.easing.points : [0.32, 0.72, 0, 1]
const EASE = Easing.bezier(X1, Y1, X2, Y2)
/** Sous cette hauteur de bloc, la liste passe en 2 × 2 (container query `jo-question-short` : 519 px au plus). */
const SHORT_HEIGHT = 519

/** `@keyframes` du lab, rejouées à l'identique (durée et easing `base`). */
const FADE = new Keyframe({ 0: { opacity: 0 }, 100: { opacity: 1, easing: EASE } }).duration(BASE_MS)
const RISE = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 16 }, { scale: 0.98 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }], easing: EASE },
}).duration(BASE_MS)
/**
 * Place d'une réponse, réservée dès l'énoncé (comme le lab, où les cartes sont là mais invisibles pendant le temps de
 * lecture) : l'image ne bouge pas quand les réponses arrivent. `jo-answer-in` : montée de 32 et fondu, décalés de
 * 120 ms par carte.
 */
function AnswerSlot({ index, shown, play, flex, children }: { index: number; shown: boolean; play: boolean; flex: boolean; children: ReactNode }) {
  const progress = useSharedValue(shown ? 1 : 0)
  useEffect(() => {
    if (!shown) {
      progress.value = 0
      return
    }
    progress.value = play ? withDelay(index * STAGGER_MS, withTiming(1, { duration: BASE_MS, easing: EASE, reduceMotion: ReduceMotion.Never })) : 1
  }, [shown, play, index, progress])
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 32 }] }))
  return (
    <Animated.View
      pointerEvents={shown ? 'auto' : 'none'}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
      accessibilityElementsHidden={!shown}
      style={[flex && { flex: 1 }, style]}
    >
      {children}
    </Animated.View>
  )
}

export interface QuestionBlockProps {
  text: string
  /** Sujet et avancement, par exemple « Rois de France · question 4 sur 7 ». */
  meta?: string
  image?: string
  /** Réponses : leur place est réservée dès l'énoncé, même avant leur apparition. */
  answers?: readonly (AnswerCardProps & { key: string })[]
  /**
   * Réponses visibles. Faux pendant le temps de lecture (fenêtre serveur `shownAt` → `revealAt`, l'équivalent du
   * `--jo-question-read` du lab) : invisibles et inactives, à leur place ; vrai : elles apparaissent une à une.
   */
  answersShown?: boolean
  /** `auto` : 2 × 2 avec une image ou quand la hauteur manque, liste sinon. */
  layout?: 'auto' | '2x2' | '4x1'
  details?: boolean
  /** Joue l'apparition de l'énoncé et des réponses. */
  animated?: boolean
  style?: StyleProp<ViewStyle>
}

/**
 * Énoncé et réponses d'une manche (`QuestionBlock` du lab), à la taille de son parent qui doit avoir une hauteur.
 * Sans image, l'énoncé est centré dans l'espace au-dessus des réponses ; avec une image, méta et énoncé en haut puis
 * l'image, centrée dans l'espace restant. L'image a une taille et un cadrage fixes (5:4, 370 pt au plus) : un grand
 * écran ne doit pas aider à répondre.
 */
export function QuestionBlock({ text, meta, image, answers, answersShown = true, layout = 'auto', details, animated = false, style }: QuestionBlockProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  // Hauteur du bloc : le lab dimensionne en `cqh` (container query sur `.jo-question`) ; ici, mesurée.
  const [height, setHeight] = useState(0)
  const play = animated && !reduced
  const short = height > 0 && height <= SHORT_HEIGHT
  const grid = layout === '2x2' || (layout === 'auto' && (Boolean(image) || short))
  // `min-h-[max(18cqh,72px)]` en 2 × 2, `min-h-[max(12cqh,64px)]` en liste.
  const cardMin = grid ? Math.max(height * 0.18, 72) : Math.max(height * 0.12, 64)
  const count = answers?.length ?? 0

  // `jo-question-lock` : réponses inactives jusqu'à la fin de leur apparition (toujours actives en mouvement réduit).
  const [locked, setLocked] = useState(true)
  useEffect(() => {
    if (count === 0 || !answersShown) {
      setLocked(true)
      return
    }
    if (!play) {
      setLocked(false)
      return
    }
    const timer = setTimeout(() => setLocked(false), (count - 1) * STAGGER_MS + BASE_MS)
    return () => clearTimeout(timer)
  }, [count, play, answersShown])

  const card = ({ key, ...answer }: AnswerCardProps & { key: string }, index: number, inRow: boolean) => (
    <AnswerSlot key={key} index={index} shown={answersShown} play={play} flex={inRow}>
      <AnswerCard details={details} {...answer} style={[{ minHeight: cardMin }, inRow && { flex: 1 }, answer.style]} />
    </AnswerSlot>
  )
  const rows = grid && answers ? [answers.slice(0, 2), answers.slice(2)].filter((row) => row.length > 0) : []

  return (
    <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)} style={[{ flex: 1, gap: tokens.space[5] }, style]}>
      <View style={{ flex: 1, minHeight: 0, gap: tokens.space[4], justifyContent: image ? 'flex-start' : 'center' }}>
        {meta && (
          <Animated.View entering={play ? FADE : undefined}>
            <Text variant="caption" weight="600" color="muted" align="center">
              {meta}
            </Text>
          </Animated.View>
        )}
        <Animated.View entering={play ? RISE : undefined}>
          <Text variant="question" align="center" accessibilityRole="header" textBreakStrategy="balanced">
            {text}
          </Text>
        </Animated.View>
        {image && (
          // Rangée `minmax(0, 1fr)` : l'image, à taille fixe, est centrée dans l'espace restant (`self-center`).
          <View style={{ flex: 1, minHeight: 0, justifyContent: 'center', alignItems: 'center', marginTop: tokens.space[2] }}>
            <Animated.View entering={play ? FADE : undefined} style={{ width: '100%', maxWidth: 370 }}>
              <Image
                source={{ uri: image }}
                contentFit="cover"
                // Préchargée à la création de la partie (`usePrefetchQuestionImages`) : lue depuis le cache.
                cachePolicy="memory-disk"
                transition={0}
                accessibilityIgnoresInvertColors
                style={{ width: '100%', aspectRatio: 5 / 4, borderRadius: radius.xl, borderWidth: HAIRLINE, borderColor: colors.border }}
              />
            </Animated.View>
          </View>
        )}
      </View>
      {count > 0 && answers && (
        <View pointerEvents={locked ? 'none' : 'auto'} style={{ gap: grid ? tokens.space[3] : tokens.space[4] }}>
          {grid
            ? rows.map((row, rowIndex) => (
                // `auto-rows-fr` : les deux cartes d'une rangée ont la même hauteur.
                <View key={rowIndex} style={{ flexDirection: 'row', alignItems: 'stretch', gap: tokens.space[3] }}>
                  {row.map((answer, index) => card(answer, rowIndex * 2 + index, true))}
                </View>
              ))
            : answers.map((answer, index) => card(answer, index, false))}
        </View>
      )}
    </View>
  )
}
