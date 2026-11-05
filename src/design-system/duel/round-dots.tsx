import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export const ROUND_RESULTS = ['correct', 'wrong', 'current', 'upcoming', 'unplayed', 'bonus', 'bonusCorrect', 'bonusWrong'] as const
export type RoundResult = (typeof ROUND_RESULTS)[number]

const LABELS: Record<RoundResult, string> = {
  correct: 'réussie',
  wrong: 'ratée',
  current: 'en cours',
  upcoming: 'à venir',
  unplayed: 'non jouée',
  bonus: 'bonus à venir',
  bonusCorrect: 'bonus réussie',
  bonusWrong: 'bonus ratée',
}

export interface RoundDotsProps {
  results: readonly RoundResult[]
  /** Diamètre en pt. Le ×2 n'apparaît qu'à partir de 20 pt. */
  size?: number
  style?: StyleProp<ViewStyle>
}

/** Avancement des manches : réussie, ratée, en cours, à venir ; la manche bonus porte ×2. */
export function RoundDots({ results, size = 24, style }: RoundDotsProps) {
  const { colors, radius } = useTheme()
  const roomy = size >= 20
  const dot = (result: RoundResult): ViewStyle => {
    switch (result) {
      case 'correct':
        return { backgroundColor: colors.correct }
      case 'wrong':
        return { backgroundColor: colors.wrong }
      case 'current':
        return { borderWidth: 2, borderColor: colors.text }
      case 'upcoming':
        return { backgroundColor: colors.raised }
      case 'unplayed':
        return { borderWidth: 1, borderColor: colors.border }
      case 'bonus':
        return { borderWidth: 2, borderColor: colors.accent }
      case 'bonusCorrect':
        return { backgroundColor: colors.correct }
      case 'bonusWrong':
        return { backgroundColor: colors.wrong }
    }
  }
  const ink = (result: RoundResult) => (result === 'bonus' ? colors.accentInk : result === 'bonusCorrect' ? colors.onCorrect : colors.onWrong)
  return (
    <View accessibilityLabel="Manches" style={[{ flexDirection: 'row', alignItems: 'center', gap: roomy ? tokens.space[3] : tokens.space[2] }, style]}>
      {results.map((result, index) => (
        <View
          key={index}
          accessible
          accessibilityLabel={`Manche ${index + 1}, ${LABELS[result]}`}
          style={[{ width: size, height: size, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' }, dot(result)]}
        >
          {result.startsWith('bonus') && roomy && (
            <Text variant="caption" weight="700" color={ink(result)} maxFontSizeMultiplier={1}>
              ×2
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}
