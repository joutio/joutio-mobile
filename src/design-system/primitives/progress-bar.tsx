import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Text } from './text'

export type ProgressTone = 'accent' | 'correct' | 'wrong' | TierCode

export interface ProgressBarProps {
  /** De 0 à 100. */
  value: number
  tone?: ProgressTone
  label?: string
  /** Nom accessible quand `label` n'est pas affiché. */
  accessibilityLabel?: string
  showValue?: boolean
  style?: StyleProp<ViewStyle>
}

/** Barre de progression, avec son libellé et sa valeur au-dessus. */
export function ProgressBar({ value, tone = 'accent', label, accessibilityLabel, showValue = false, style }: ProgressBarProps) {
  const { colors, radius } = useTheme()
  const percent = Math.min(100, Math.max(0, Math.round(value)))
  const color = tone === 'accent' ? colors.accent : tone === 'correct' ? colors.correct : tone === 'wrong' ? colors.wrong : tokens.tier[tone].hex

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label ?? accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={[{ alignSelf: 'stretch', gap: tokens.space[3] }, style]}
    >
      {(label || showValue) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[3] }}>
          <Text variant="caption" weight="600" style={{ flexShrink: 1 }}>
            {label}
          </Text>
          {showValue && (
            <Text variant="caption" color="muted" mono>
              {percent} %
            </Text>
          )}
        </View>
      )}
      <View style={{ height: 8, overflow: 'hidden', borderRadius: radius.xs, backgroundColor: colors.raised }}>
        <View style={{ width: `${percent}%`, height: '100%', backgroundColor: color }} />
      </View>
    </View>
  )
}
