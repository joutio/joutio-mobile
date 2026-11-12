import type { ReactNode } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { PremiumBadge } from '../brand/premium-badge'
import { tokens } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text, type TextProps } from './text'

export interface PlayerNameProps extends Pick<TextProps, 'variant' | 'weight' | 'color'> {
  name: string
  /** Joueur Premium : `PremiumBadge` à droite du pseudonyme, 4 pt d'écart. */
  premium?: boolean
  /** Côté du badge : 18 avec `headline`, 22 avec `title2`, 16 au-dessous. */
  badgeSize?: number
  /** Alignement de la ligne (colonnes centrées, côté adverse à droite). */
  justify?: ViewStyle['justifyContent']
  style?: StyleProp<ViewStyle>
}

/**
 * Pseudonyme d'un joueur suivi du badge Premium s'il l'est (`design/specs/components/primitives.md` § Identité d'un
 * joueur) : le pseudonyme se tronque, le badge reste visible.
 */
export function PlayerName({ name, premium = false, badgeSize = 18, variant = 'headline', weight, color, justify = 'flex-start', style }: PlayerNameProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], maxWidth: '100%', minWidth: 0, justifyContent: justify }, style]}>
      <Text variant={variant} weight={weight} color={color} numberOfLines={1} style={{ flexShrink: 1 }}>
        {name}
      </Text>
      {premium && <PremiumBadge size={badgeSize} />}
    </View>
  )
}

export interface PlayerLinkProps {
  /** Ouvre la fiche du joueur (le Profil pour soi). Absent : rien de cliquable (duel, salon, matchmaking). */
  onOpen?: () => void
  name: string
  style?: StyleProp<ViewStyle>
  children: ReactNode
}

/** Avatar ou pseudonyme qui ouvre la fiche du joueur ; sans `onOpen`, le contenu tel quel. */
export function PlayerLink({ onOpen, name, style, children }: PlayerLinkProps) {
  if (!onOpen) return <View style={style}>{children}</View>
  return (
    <PressableScale accessibilityRole="button" accessibilityLabel={`Voir la fiche de ${name}`} onPress={onOpen} style={style}>
      {children}
    </PressableScale>
  )
}
