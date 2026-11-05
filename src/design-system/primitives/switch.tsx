import { Platform, Switch as NativeSwitch, type StyleProp, type ViewStyle } from 'react-native'
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

const ANDROID = Platform.OS === 'android'

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
      trackColor={{ false: ANDROID ? colors.border : colors.hover, true: colors.accent }}
      ios_backgroundColor={colors.hover}
      // Android (Material) : en position off, curseur gris sur piste discrète ; un curseur blanc dans les deux
      // positions faisait passer l'état off pour l'état on. iOS garde le curseur blanc d'UISwitch.
      thumbColor={ANDROID && !checked ? colors.muted : tokens.color.dark.text}
      style={[disabled && { opacity: 0.4 }, style]}
    />
  )
}
