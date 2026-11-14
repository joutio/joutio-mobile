import { Pressable, View } from 'react-native'
import { CaretDownIcon, CaretUpIcon } from '../icons'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { slopFor } from '../primitives/pressable-scale'

export interface SwipeHintProps {
  /** `up` : bandeau en bas d'une page qui en annonce une suivante ; `down` : miroir en haut de la page suivante. */
  direction: 'up' | 'down'
  /** Titre de la page annoncée (bandeau seulement), par exemple « Détails du duel ». */
  title?: string
  /** Geste à faire, par exemple « Glisse vers le haut pour revoir les questions ». Absent sur le miroir (caret seul). */
  hint?: string
  /** Nom accessible : l'action du toucher. */
  label: string
  /** Complète le nom accessible : ce que le toucher ouvre. */
  accessibilityHint?: string
  onPress?: () => void
  /** Marge basse du bandeau (safe area), ajoutée au 12 pt du lab. */
  bottomInset?: number
}

/**
 * Annonce d'une page voisine d'un pager vertical (`ResultPages`, `resultat.md` § 6) : caret, titre et geste
 * facultatifs (le miroir en haut de la page 2 n'a que le caret, 2026-11-12). Un toucher fait la même bascule que le
 * glissé. Port de `SwipeHint` du lab : `gap-0.5 px-4`, bandeau `pt-3 pb-[safe+12px]`, miroir `pt-1 pb-1`.
 */
export function SwipeHint({ direction, title, hint, label, accessibilityHint, onPress, bottomInset = 0 }: SwipeHintProps) {
  const { colors } = useTheme()
  const Caret = direction === 'up' ? CaretUpIcon : CaretDownIcon
  const banner = direction === 'up'
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      hitSlop={banner ? undefined : slopFor(20 + tokens.space[2] * 2)}
      style={{
        alignSelf: 'stretch',
        alignItems: 'center',
        gap: tokens.space[1],
        paddingHorizontal: tokens.space[5],
        paddingTop: banner ? tokens.space[4] : tokens.space[2],
        paddingBottom: banner ? bottomInset + tokens.space[4] : tokens.space[2],
      }}
    >
      <Caret size={20} color={colors.muted} />
      {title && <Text variant="headline">{title}</Text>}
      {hint && (
        <View style={{ maxWidth: '100%' }}>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {hint}
          </Text>
        </View>
      )}
    </Pressable>
  )
}
