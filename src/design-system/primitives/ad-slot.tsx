import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export interface AdSlotProps {
  /** Texte de la maquette, à la place de la régie. */
  placeholder?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Emplacement de bannière (`etats-systeme.md`), toujours libellé « Publicité », jamais pendant un duel. Place
 * réservée seulement : aucune régie ni alerte de suivi en V1.
 */
export function AdSlot({ placeholder = 'régie · 320×50', style }: AdSlotProps) {
  const { colors, radius } = useTheme()
  return (
    <View accessibilityRole="none" accessibilityLabel="Publicité" style={[{ width: '100%', gap: tokens.space[1] }, style]}>
      <Text variant="caption" weight="600" color="muted">
        Publicité
      </Text>
      <View
        style={{
          height: 50,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.sm,
          // Les rayures du lab (`repeating-linear-gradient`) deviennent un fond uni et un filet en pointillés.
          backgroundColor: colors.raised,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: colors.hover,
        }}
      >
        <Text variant="caption" mono color="muted">
          {placeholder}
        </Text>
      </View>
    </View>
  )
}
