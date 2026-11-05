import { View, type StyleProp, type ViewStyle } from 'react-native'
import { PressableScale } from '../primitives/pressable-scale'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export type ReviewAnswer = 'correct' | 'wrong' | 'none'

const LABELS: Record<ReviewAnswer, string> = { correct: 'bonne réponse', wrong: 'mauvaise réponse', none: 'sans réponse' }

export interface ReviewRoundTab {
  me: ReviewAnswer
  opponent: ReviewAnswer
  /** Points gagnés sur la manche. */
  points: number
}

export interface RoundReviewTabsProps {
  rounds: readonly ReviewRoundTab[]
  value: number
  onChange?: (index: number) => void
  /** Pseudonymes, lus par les lecteurs d'écran (jamais « toi »). */
  me: string
  opponent: string
  style?: StyleProp<ViewStyle>
}

/** Sélecteur de manche de la revue : mon résultat à gauche, celui de l'adversaire à droite. */
export function RoundReviewTabs({ rounds, value, onChange, me, opponent, style }: RoundReviewTabsProps) {
  const { colors, radius } = useTheme()
  const dot = (answer: ReviewAnswer) => (answer === 'correct' ? colors.correct : answer === 'wrong' ? colors.wrong : colors.raised)
  return (
    <View accessibilityLabel="Manches" style={[{ flexDirection: 'row', gap: tokens.space[2] }, style]}>
      {rounds.map((round, index) => {
        const current = index === value
        return (
          <PressableScale
            key={index}
            accessibilityRole="tab"
            accessibilityState={{ selected: current }}
            accessibilityLabel={`Question ${index + 1} : ${me}, ${LABELS[round.me]} ; ${opponent}, ${LABELS[round.opponent]} ; ${round.points} points`}
            onPress={() => onChange?.(index)}
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: 'center',
              gap: tokens.space[2],
              paddingVertical: tokens.space[3],
              paddingHorizontal: tokens.space[1],
              borderRadius: radius.md,
              borderWidth: current ? 2 : 1,
              borderColor: current ? colors.accent : colors.border,
              backgroundColor: current ? colors.warm : 'transparent',
            }}
          >
            <Text variant="caption" weight="600" color="muted">
              Q{index + 1}
            </Text>
            <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: dot(round.me) }} />
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: dot(round.opponent) }} />
            </View>
            <Text variant="caption" weight="600" mono>
              {round.points}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}
