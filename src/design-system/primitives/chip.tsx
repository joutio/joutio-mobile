import type { StyleProp, ViewStyle } from 'react-native'
import type { Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { PressableScale, slopFor, type PressableScaleProps } from './pressable-scale'
import { Text } from './text'
import { hairlineRing } from '../theme/hairline'

export interface ChipProps extends Omit<PressableScaleProps, 'children' | 'style'> {
  selected?: boolean
  /** `suggestion` : réponse rapide, filet sans fond. */
  variant?: 'filter' | 'suggestion'
  icon?: Icon
  count?: number
  style?: StyleProp<ViewStyle>
  children: string
}

export function Chip({ selected = false, variant = 'filter', icon: IconComponent, count, disabled, style, children, ...props }: ChipProps) {
  const { colors, radius } = useTheme()
  const foreground = selected ? colors.bg : colors.text
  return (
    <PressableScale
      {...props}
      accessibilityRole="togglebutton"
      accessibilityLabel={count === undefined ? children : `${children}, ${count}`}
      accessibilityState={{ checked: selected, disabled: Boolean(disabled) }}
      disabled={disabled}
      pressedScale={1}
      haptic="selection"
      hitSlop={slopFor(32)}
      style={({ pressed }) => [
        {
          minHeight: 32,
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: tokens.space[3],
          paddingHorizontal: tokens.space[4],
          borderRadius: radius.full,
          backgroundColor: selected ? colors.text : variant === 'suggestion' ? 'transparent' : colors.raised,
          boxShadow: !selected && variant === 'suggestion' ? hairlineRing(colors.border) : undefined,
          opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {IconComponent && <IconComponent size={16} color={foreground} />}
      <Text variant="callout" color={foreground} weight={selected || variant === 'suggestion' ? '600' : undefined} numberOfLines={1}>
        {children}
      </Text>
      {count !== undefined && (
        <Text variant="callout" mono color={foreground} style={{ opacity: 0.7 }}>
          {count}
        </Text>
      )}
    </PressableScale>
  )
}
