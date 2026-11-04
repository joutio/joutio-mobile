import { Switch as NativeSwitch, type StyleProp, type ViewStyle } from 'react-native'
import { haptic } from '../haptics'
import { tokens } from '../tokens.generated'
import { useTheme } from '../theme/theme-provider'

export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
  /** Dans une ligne déjà interactive (`ListRow`) : la ligne porte le nom et l'état. */
  embedded?: boolean
  style?: StyleProp<ViewStyle>
}

/** Interrupteur système (UISwitch, Material), piste ambre et curseur blanc dans les deux thèmes. */
export function Switch({ checked, onChange, label, disabled = false, embedded = false, style }: SwitchProps) {
  const { colors } = useTheme()
  return (
    <NativeSwitch
      value={checked}
      onValueChange={(value) => {
        haptic('selection')
        onChange(value)
      }}
      disabled={disabled}
      accessibilityLabel={embedded ? undefined : label}
      importantForAccessibility={embedded ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={embedded}
      trackColor={{ false: colors.hover, true: colors.accent }}
      ios_backgroundColor={colors.hover}
      thumbColor={tokens.color.dark.text}
      style={style}
    />
  )
}
