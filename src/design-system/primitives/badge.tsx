import { View, type StyleProp, type ViewStyle } from 'react-native'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Text } from './text'

export type BadgeVariant = 'neutral' | 'accent' | 'correct' | 'wrong' | 'outline' | 'tier'

export interface BadgeProps {
  variant?: BadgeVariant
  /** Requis avec la variante `tier`. */
  tier?: TierCode
  style?: StyleProp<ViewStyle>
  children: string | number
}

export function Badge({ variant = 'neutral', tier = 'OR', style, children }: BadgeProps) {
  const { colors, radius } = useTheme()
  const styles: Record<BadgeVariant, { background: string; foreground: string; border?: string }> = {
    neutral: { background: colors.raised, foreground: colors.muted },
    accent: { background: colors.accent, foreground: colors.onAccent },
    correct: { background: alpha(colors.correct, 0.16), foreground: colors.correct },
    wrong: { background: alpha(colors.wrong, 0.16), foreground: colors.wrong },
    outline: { background: 'transparent', foreground: colors.muted, border: colors.border },
    // Le Fer est sombre : son texte prend le blanc du thème dark.
    tier: { background: tokens.tier[tier].hex, foreground: tier === 'FER' ? tokens.color.dark.text : colors.onAccent },
  }
  const { background, foreground, border } = styles[variant]
  return (
    <View
      style={[
        {
          minHeight: 24,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: tokens.space[2],
          paddingHorizontal: tokens.space[3],
          borderRadius: radius.xs,
          backgroundColor: background,
          borderWidth: border ? 1 : 0,
          borderColor: border,
        },
        style,
      ]}
    >
      <Text variant="caption" weight="600" color={foreground} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}
