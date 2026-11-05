import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme, type ThemeColors } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export type StatTone = 'neutral' | 'up' | 'down' | 'accent'

const TONE: Record<StatTone, keyof ThemeColors> = { neutral: 'text', up: 'correct', down: 'wrong', accent: 'accentInk' }

export interface StatProps {
  label: string
  value: string
  hint?: string
  tone?: StatTone
  /** Centré, pour une rangée de trois. */
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

/** Chiffre clé sur une tuile : libellé, valeur en mono, indice facultatif. */
export function Stat({ label, value, hint, tone = 'neutral', compact = false, style }: StatProps) {
  const { colors, radius } = useTheme()
  return (
    <View
      accessible
      accessibilityLabel={[label, value, hint].filter(Boolean).join(', ')}
      style={[
        {
          flex: 1,
          minWidth: 0,
          gap: tokens.space[2],
          padding: tokens.space[4],
          borderRadius: radius.md,
          backgroundColor: colors.surface,
        },
        compact && { alignItems: 'center', paddingHorizontal: tokens.space[2] },
        style,
      ]}
    >
      <Text variant="caption" color="muted" numberOfLines={compact ? 2 : 1} align={compact ? 'center' : 'left'}>
        {label}
      </Text>
      <Text variant="numeric" color={TONE[tone]} numberOfLines={1}>
        {value}
      </Text>
      {hint && (
        <Text variant="caption" color="muted" numberOfLines={1}>
          {hint}
        </Text>
      )}
    </View>
  )
}
