import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import type { Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export interface EmptyStateProps {
  icon: Icon
  title: string
  description?: string
  action?: ReactNode
  /**
   * Prend toute la hauteur restante de son parent et s'y centre. Seulement quand ce parent a une hauteur bornée
   * (écran sans défilement, étape d'onboarding) ; dans une liste ou un onglet, l'état vide se place en haut.
   */
  fill?: boolean
  style?: StyleProp<ViewStyle>
}

/** Aucun contenu : pictogramme, titre, explication, action. */
export function EmptyState({ icon: IconComponent, title, description, action, fill = false, style }: EmptyStateProps) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        {
          flexGrow: fill ? 1 : 0,
          alignSelf: 'stretch',
          alignItems: 'center',
          justifyContent: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingVertical: tokens.space[7],
        },
        style,
      ]}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: '-6deg' }],
        }}
      >
        <IconComponent size={28} weight="fill" color={colors.onAccent} />
      </View>
      <Text variant="title2" align="center" accessibilityRole="header">
        {title}
      </Text>
      {description && (
        <Text color="muted" align="center" style={{ maxWidth: 300 }}>
          {description}
        </Text>
      )}
      {action && <View style={{ alignSelf: 'stretch', marginTop: tokens.space[3] }}>{action}</View>}
    </View>
  )
}
