import { useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { BellIcon, CaretRightIcon, CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, type Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Avatar, type AvatarProps } from './avatar'
import { Button } from './button'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export type ToastTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export interface ToastProps {
  tone?: ToastTone
  title: string
  description?: string
  icon?: Icon
  /** Joueur à l'origine du message : remplace l'icône. */
  actor?: Pick<AvatarProps, 'name' | 'src' | 'tier'>
  action?: { label: string; onPress?: () => void }
  /** Rend tout le toast touchable. Exclut `action`. */
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** Contenu d'un toast. Le comportement (file, minuterie, balayage) est dans `ToastHost`. */
export function Toast({ tone = 'neutral', title, description, icon, actor, action, onPress, style }: ToastProps) {
  const { colors, radius } = useTheme()
  const tones: Record<ToastTone, { icon: Icon; color: string; regular?: boolean }> = {
    success: { icon: CheckCircleIcon, color: colors.correct },
    danger: { icon: XCircleIcon, color: colors.wrong },
    warning: { icon: WarningIcon, color: colors.accentInk },
    info: { icon: InfoIcon, color: colors.accentInk },
    neutral: { icon: BellIcon, color: colors.muted, regular: true },
  }
  const { icon: toneIcon, color, regular } = tones[tone]
  const IconComponent = icon ?? toneIcon
  // L'icône grandit dès que le texte tient sur deux lignes : description, ou titre qui passe à la ligne.
  const [wrapped, setWrapped] = useState(false)
  const tall = Boolean(description) || wrapped

  const content = (
    <>
      {actor ? <Avatar {...actor} size="sm" decorative /> : <IconComponent size={tall ? 32 : 20} weight={regular ? 'regular' : 'fill'} color={color} />}
      <View style={{ flex: 1, minWidth: 0, gap: tokens.space[1] }}>
        <Text variant="callout" weight="600" onTextLayout={(event) => setWrapped(event.nativeEvent.lines.length > 1)}>
          {title}
        </Text>
        {description && (
          <Text variant="caption" color="muted">
            {description}
          </Text>
        )}
      </View>
      {action && !onPress && (
        <Button variant="plain" size="S" style={{ alignSelf: 'center' }} onPress={action.onPress}>
          {action.label}
        </Button>
      )}
      {onPress && <CaretRightIcon size={16} color={colors.muted} />}
    </>
  )

  const box: ViewStyle = {
    alignSelf: 'stretch',
    maxWidth: 358,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    paddingHorizontal: 14,
    paddingVertical: tokens.space[4],
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    boxShadow: colors.shadow,
  }
  const label = [actor?.name, title, description].filter(Boolean).join(', ')

  return onPress ? (
    <PressableScale accessibilityRole="button" accessibilityLabel={label} pressedScale={0.98} onPress={onPress} style={[box, style]}>
      {content}
    </PressableScale>
  ) : (
    <View accessibilityRole="alert" accessibilityLabel={action ? undefined : label} style={[box, style]}>
      {content}
    </View>
  )
}
