import { View, type StyleProp, type ViewStyle } from 'react-native'
import type { Icon } from '../icons'
import { tint } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export type PillTone = 'neutral' | 'online' | 'pending' | 'suspended' | 'correct' | 'wrong'

export interface PillProps {
  tone?: PillTone
  icon?: Icon
  style?: StyleProp<ViewStyle>
  children: string
}

/** Statut court : présence, attente, suspension, issue. */
export function Pill({ tone = 'neutral', icon: IconComponent, style, children }: PillProps) {
  const { colors, radius } = useTheme()
  const color = {
    neutral: colors.muted,
    online: colors.correct,
    pending: colors.accentInk,
    suspended: colors.wrong,
    correct: colors.correct,
    wrong: colors.wrong,
  }[tone]
  const hasDot = !IconComponent && (tone === 'online' || tone === 'pending' || tone === 'suspended')
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
          borderRadius: radius.full,
          backgroundColor: tint(tone === 'pending' ? colors.accent : color),
        },
        style,
      ]}
    >
      {IconComponent && <IconComponent size={14} weight="fill" color={color} />}
      {hasDot && <View style={{ width: 6, height: 6, borderRadius: radius.full, backgroundColor: color }} />}
      <Text variant="caption" weight="600" color={color} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}
