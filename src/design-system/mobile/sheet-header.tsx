import type { ReactNode, Ref } from 'react'
import { View } from 'react-native'
import type { ViewRef } from '../a11y'
import { CaretLeftIcon, XIcon, type Icon } from '../icons'
import { PressableScale, slopFor } from '../primitives/pressable-scale'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

export interface SheetHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  /** Remplace le bouton Fermer. */
  action?: ReactNode
  onClose?: () => void
  /** Reçoit le focus du lecteur d'écran à l'ouverture. */
  titleRef?: Ref<ViewRef>
  /** Limite de lignes du sous-titre : une feuille persistante garde ainsi une hauteur d'en-tête fixe. */
  subtitleLines?: number
  /** Poignée dessinée. `false` dans une `MobileSheet` : la feuille native affiche la sienne. */
  handle?: boolean
}

/** Bouton rond d'une feuille, au standard iOS : 30 pt, fond gris, glyphe 15 pt en gras ; cible portée à 44 pt. */
const SHEET_BUTTON = 30

function SheetButton({ icon: IconComponent, label, onPress }: { icon: Icon; label: string; onPress: () => void }) {
  const { colors, radius } = useTheme()
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={slopFor(SHEET_BUTTON, SHEET_BUTTON)}
      pressedScale={0.94}
      onPress={onPress}
      style={{
        width: SHEET_BUTTON,
        height: SHEET_BUTTON,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.raised,
      }}
    >
      <IconComponent size={15} weight="bold" color={colors.muted} />
    </PressableScale>
  )
}

/** Poignée 36 × 5, puis trois colonnes : retour, titre, action ou Fermer (boutons ronds de 30 pt, standard iOS). */
export function SheetHeader({ title, subtitle, subtitleLines, onBack, action, onClose, titleRef, handle = true }: SheetHeaderProps) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={{ alignSelf: 'stretch', gap: tokens.space[2], paddingHorizontal: tokens.space[3], paddingTop: tokens.space[3], paddingBottom: tokens.space[2] }}
    >
      {handle ? (
        <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: radius.xs, backgroundColor: colors.border }} />
      ) : (
        <View style={{ height: tokens.space[4] }} />
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}>
        <View style={{ flex: 1, minWidth: 44, alignItems: 'flex-start' }}>
          {onBack && <SheetButton icon={CaretLeftIcon} label="Retour" onPress={onBack} />}
        </View>
        <View ref={titleRef} accessible accessibilityRole="header" style={{ minWidth: 0, flexShrink: 1, alignItems: 'center' }}>
          <Text variant="headline" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption" color="muted" numberOfLines={subtitleLines}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 44, alignItems: 'flex-end' }}>
          {action ? (
            // Le `Button` impose son propre `alignSelf` : son conteneur le cale à droite, et la marge négative aligne le
            // texte sur le bord du contenu de la feuille (16 pt), malgré le rembourrage du bouton.
            <View style={{ alignSelf: 'flex-end', marginRight: -tokens.space[2] }}>{action}</View>
          ) : (
            onClose && <SheetButton icon={XIcon} label="Fermer" onPress={onClose} />
          )}
        </View>
      </View>
    </View>
  )
}
