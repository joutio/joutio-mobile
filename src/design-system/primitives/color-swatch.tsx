import { View, type StyleProp, type ViewStyle } from 'react-native'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { PressableScale } from './pressable-scale'

export interface ColorSwatchProps {
  /** Couleur choisie par le joueur : une donnée, pas un token. */
  color: string
  /** Nom lisible par les lecteurs d'écran. */
  label: string
  selected?: boolean
  onSelect?: () => void
  style?: StyleProp<ViewStyle>
}

/** Pastille de couleur, dans un groupe à choix unique. L'anneau marque la sélection. */
export function ColorSwatch({ color, label, selected = false, onSelect, style }: ColorSwatchProps) {
  const { colors, radius } = useTheme()
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      haptic="selection"
      pressedScale={0.94}
      onPress={onSelect}
      style={[
        {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.full,
          borderWidth: 2,
          borderColor: selected ? colors.accent : 'transparent',
        },
        style,
      ]}
    >
      <View style={{ width: 32, height: 32, borderRadius: radius.full, backgroundColor: color, borderWidth: HAIRLINE, borderColor: colors.border }} />
    </PressableScale>
  )
}
