import type { ReactNode } from 'react'
import { View, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native'
import { CaretRightIcon, CheckCircleIcon, CircleIcon, RadioButtonIcon, type Icon } from '../icons'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Switch } from './switch'
import { Text } from './text'

export type ListRowControl = 'chevron' | 'toggle' | 'check' | 'radio' | 'value' | 'none'

export interface ListRowProps {
  label: string
  sub?: string
  icon?: Icon
  /** Visuel à gauche à la place de l'icône, par exemple un drapeau. */
  leading?: ReactNode
  control?: ListRowControl
  value?: string
  on?: boolean
  destructive?: boolean
  strong?: boolean
  /** Dernière ligne de la liste : sans filet. */
  last?: boolean
  disabled?: boolean
  /** Pour `chevron`, `value` et `none`. */
  onPress?: () => void
  /** Requis avec `toggle`, `check` et `radio` : toute la ligne pilote l'état. */
  onToggle?: (on: boolean) => void
  /** Force l'état pressé (catalogue). */
  forcePressed?: boolean
  style?: StyleProp<ViewStyle>
}

const STATE_ROLES: Partial<Record<ListRowControl, AccessibilityRole>> = { toggle: 'switch', check: 'checkbox', radio: 'radio' }

/** Ligne de réglages ou de navigation : toute la ligne est la cible. */
export function ListRow({
  label,
  sub,
  icon: IconComponent,
  leading,
  control = 'chevron',
  value,
  on = false,
  destructive = false,
  strong = false,
  last = false,
  disabled = false,
  onPress,
  onToggle,
  forcePressed,
  style,
}: ListRowProps) {
  const { colors } = useTheme()
  const stateRole = STATE_ROLES[control]
  const SelectIcon = control === 'radio' ? (on ? RadioButtonIcon : CircleIcon) : on ? CheckCircleIcon : CircleIcon
  const textColor = destructive ? colors.wrong : colors.text
  // Sans action ni état : ligne d'information, lue comme du texte.
  const interactive = Boolean(stateRole || onPress)

  return (
    <PressableScale
      accessibilityRole={interactive ? (stateRole ?? (control === 'chevron' ? 'link' : 'button')) : 'text'}
      accessibilityLabel={[label, sub, value].filter(Boolean).join(', ')}
      accessibilityState={stateRole ? { checked: on, disabled } : { disabled }}
      disabled={disabled || !interactive}
      pressedScale={1}
      ripple
      haptic={stateRole ? 'selection' : undefined}
      forcePressed={forcePressed}
      onPress={stateRole ? () => onToggle?.(control === 'radio' ? true : !on) : onPress}
      style={({ pressed }) => [
        {
          minHeight: sub ? 64 : 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingVertical: tokens.space[3],
          backgroundColor: pressed ? colors.hover : 'transparent',
          opacity: disabled ? 0.4 : 1,
        },
        style,
      ]}
    >
      {leading && (
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          {leading}
        </View>
      )}
      {IconComponent && <IconComponent size={20} color={destructive ? colors.wrong : colors.muted} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} color={textColor} weight={strong ? '600' : undefined}>
          {label}
        </Text>
        {sub && (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      {control === 'toggle' && <Switch embedded label={label} checked={on} disabled={disabled} onChange={(value) => onToggle?.(value)} />}
      {control === 'chevron' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
          {value && <Text color="muted">{value}</Text>}
          <CaretRightIcon size={14} color={colors.muted} />
        </View>
      )}
      {control === 'value' && <Text color="muted">{value}</Text>}
      {(control === 'check' || control === 'radio') && <SelectIcon size={24} weight={on ? 'fill' : 'regular'} color={on ? colors.accentInk : colors.muted} />}
      {!last && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: tokens.space[5] + (IconComponent ? 20 + tokens.space[4] : 0),
            right: 0,
            bottom: 0,
            height: HAIRLINE,
            backgroundColor: colors.border,
          }}
        />
      )}
    </PressableScale>
  )
}
