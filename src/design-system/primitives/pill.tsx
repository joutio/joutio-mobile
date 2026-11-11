import { View, type StyleProp, type ViewStyle } from 'react-native'
import type { Icon } from '../icons'
import { categoryInk, mix, tint } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { Text } from './text'

export type PillTone = 'neutral' | 'online' | 'pending' | 'suspended' | 'correct' | 'wrong'

export interface PillProps {
  tone?: PillTone
  /**
   * Teinte d'univers (catégorie d'un sujet), à la place de `tone`. Fond **opaque** (couleur de l'univers à 22 % mêlée
   * au fond) : lisible posée sur une image, dans les deux thèmes (`design/specs/components/primitives.md` § Pill).
   */
  category?: CategoryCode
  icon?: Icon
  style?: StyleProp<ViewStyle>
  children: string
}

/** Statut court : présence, attente, suspension, issue. */
export function Pill({ tone = 'neutral', category, icon: IconComponent, style, children }: PillProps) {
  const { colors, radius } = useTheme()
  const color = {
    neutral: colors.muted,
    online: colors.correct,
    pending: colors.accentInk,
    suspended: colors.wrong,
    correct: colors.correct,
    wrong: colors.wrong,
  }[tone]
  const universe = category ? tokens.category[category].color : undefined
  const ink = universe ? categoryInk(universe, colors.text) : color
  const background = universe ? mix(universe, colors.bg, 0.22) : tint(tone === 'pending' ? colors.accent : color)
  const hasDot = !category && !IconComponent && (tone === 'online' || tone === 'pending' || tone === 'suspended')
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
          backgroundColor: background,
        },
        style,
      ]}
    >
      {IconComponent && <IconComponent size={14} weight="fill" color={ink} />}
      {hasDot && <View style={{ width: 6, height: 6, borderRadius: radius.full, backgroundColor: ink }} />}
      <Text variant="caption" weight="600" color={ink} numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}
