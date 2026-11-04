import type { ReactNode, Ref } from 'react'
import { View } from 'react-native'
import type { ViewRef } from '../a11y'
import { CaretLeftIcon, XIcon } from '../icons'
import { IconButton } from '../primitives/icon-button'
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
  /** Poignée dessinée. `false` dans une `MobileSheet` : la feuille native affiche la sienne. */
  handle?: boolean
}

/** Poignée 36 × 5, puis trois colonnes : retour, titre, action ou Fermer. */
export function SheetHeader({ title, subtitle, onBack, action, onClose, titleRef, handle = true }: SheetHeaderProps) {
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
          {onBack && <IconButton icon={CaretLeftIcon} label="Retour" variant="gray" onPress={onBack} />}
        </View>
        <View ref={titleRef} accessible accessibilityRole="header" style={{ minWidth: 0, flexShrink: 1, alignItems: 'center' }}>
          <Text variant="headline" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text variant="caption" color="muted">
              {subtitle}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 44, alignItems: 'flex-end' }}>
          {action ?? (onClose && <IconButton icon={XIcon} label="Fermer" variant="gray" onPress={onClose} />)}
        </View>
      </View>
    </View>
  )
}
