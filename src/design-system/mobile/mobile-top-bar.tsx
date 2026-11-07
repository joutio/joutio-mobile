import type { ReactNode } from 'react'
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native'
import { CaretLeftIcon } from '../icons'
import { Button } from '../primitives/button'
import { IconButton } from '../primitives/icon-button'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { GlassBackground } from './glass'

/** Hauteur de la barre : 52 pt sur iOS (lab), 64 dp sur Android comme la barre Material (décision du 2026-11-06). */
export const TOP_BAR_HEIGHT = Platform.OS === 'android' ? 64 : 52

interface Common {
  glass?: boolean
  style?: StyleProp<ViewStyle>
}

interface LargeBar extends Common {
  variant?: 'large'
  title: string
  subtitle?: string
  left?: ReactNode
  right?: ReactNode
}

/**
 * Écran poussé : titre centré, retour texte ou élément libre à gauche.
 * `subtitle` : contexte de la page (sujet, adversaire) sous le titre, jamais concaténé au titre.
 * `back` nomme la page précédente par son type (« Sujet », « Profil »).
 */
interface InlineBar extends Common {
  variant: 'inline'
  title?: string
  subtitle?: string
  back?: string
  onBack?: () => void
  left?: ReactNode
  right?: ReactNode
}

/** Saisie plein écran : Annuler et Confirmer. */
interface ModalBar extends Common {
  variant: 'modal'
  title: string
  cancel?: string
  confirm?: string
  confirmDisabled?: boolean
  confirmLoading?: boolean
  onCancel?: () => void
  onConfirm?: () => void
}

/** Sur une image : boutons en pastille, sans fond de barre. */
interface MediaBar extends Common {
  variant: 'media'
  onBack?: () => void
  right?: ReactNode
}

export type MobileTopBarProps = LargeBar | InlineBar | ModalBar | MediaBar

/** Trois colonnes : les côtés partagent la place, le centre garde la sienne. */
function ThreeColumns({
  left,
  center,
  right,
  glass,
  style,
}: {
  left: ReactNode
  center: ReactNode
  right: ReactNode
  glass?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[{ height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingHorizontal: tokens.space[3] }, style]}>
      {glass && <GlassBackground />}
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-start', minWidth: 0 }}>{left}</View>
      <View style={{ maxWidth: 200, minWidth: 0, alignItems: 'center' }}>{center}</View>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', minWidth: 0 }}>{right}</View>
    </View>
  )
}

export function MobileTopBar(props: MobileTopBarProps) {
  const { space } = useTheme()

  if (props.variant === 'media') {
    return (
      <View
        style={[
          { height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[4] },
          props.style,
        ]}
      >
        <IconButton icon={CaretLeftIcon} label="Retour" media onPress={props.onBack} />
        {props.right && <View style={{ flexDirection: 'row', gap: space[3] }}>{props.right}</View>}
      </View>
    )
  }

  if (props.variant === 'modal') {
    const { title, cancel = 'Annuler', confirm = 'OK', confirmDisabled, onCancel, onConfirm } = props
    return (
      <ThreeColumns
        glass={props.glass}
        style={props.style}
        left={
          <Button variant="plain" size="M" regular style={{ alignSelf: 'center' }} onPress={onCancel}>
            {cancel}
          </Button>
        }
        center={
          <Text variant="headline" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        }
        right={
          <Button variant="plain" size="M" loading={props.confirmLoading} disabled={confirmDisabled} style={{ alignSelf: 'center' }} onPress={onConfirm}>
            {confirm}
          </Button>
        }
      />
    )
  }

  if (props.variant === 'inline') {
    const { title, subtitle, back, onBack, left, right } = props
    return (
      <ThreeColumns
        glass={props.glass}
        style={props.style}
        left={
          back ? (
            <Button
              variant="plain"
              size="M"
              regular
              icon={CaretLeftIcon}
              onPress={onBack}
              accessibilityLabel={`Retour, ${back}`}
              style={{ paddingHorizontal: 0, alignSelf: 'center' }}
            >
              {back}
            </Button>
          ) : (
            left
          )
        }
        center={
          <>
            {title && (
              <Text variant="headline" numberOfLines={1} accessibilityRole="header">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text variant="caption" color="muted" numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </>
        }
        right={right}
      />
    )
  }

  const { title, subtitle, left, right, glass, style } = props
  return (
    <View
      style={[
        {
          minHeight: TOP_BAR_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space[3],
          paddingVertical: space[2],
          paddingLeft: space[5],
          paddingRight: space[3],
        },
        style,
      ]}
    >
      {glass && <GlassBackground />}
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="largeTitle" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        {subtitle && (
          <Text variant="callout" color="muted" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {right && <View style={{ flexDirection: 'row', alignItems: 'center' }}>{right}</View>}
    </View>
  )
}
