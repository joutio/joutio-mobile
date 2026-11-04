import type { StyleProp, ViewStyle } from 'react-native'
import { CategoryIcon } from '../brand/category-icon'
import { useTheme } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'
import { hairlineRing } from '../theme/hairline'

export interface CategoryTileProps {
  category: CategoryCode
  selected?: boolean
  /** Limite de choix atteinte. */
  disabled?: boolean
  onToggle?: (selected: boolean) => void
  style?: StyleProp<ViewStyle>
}

/** Choix d'un univers à l'onboarding, en grille de 3 colonnes. */
export function CategoryTile({ category, selected = false, disabled = false, onToggle, style }: CategoryTileProps) {
  const { colors, radius } = useTheme()
  const foreground = selected ? colors.bg : colors.text
  return (
    <PressableScale
      accessibilityRole="checkbox"
      accessibilityLabel={tokens.category[category].label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      haptic="selection"
      onPress={() => onToggle?.(!selected)}
      style={[
        {
          minHeight: 64,
          minWidth: 0,
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.space[2],
          paddingHorizontal: 6,
          paddingVertical: tokens.space[3],
          borderRadius: radius.md,
          backgroundColor: selected ? colors.text : colors.raised,
          boxShadow: selected ? undefined : hairlineRing(colors.border),
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      <CategoryIcon category={category} size={20} weight={selected ? 'fill' : 'regular'} color={foreground} />
      <Text variant="caption" weight="600" color={foreground} numberOfLines={1}>
        {tokens.category[category].label}
      </Text>
    </PressableScale>
  )
}
