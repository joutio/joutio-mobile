import { View, type StyleProp, type ViewStyle } from 'react-native'
import { BellIcon, CaretRightIcon, CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon, type Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Avatar, type AvatarProps } from './avatar'
import { PressableScale } from './pressable-scale'
import { Spinner } from './spinner'
import { Text } from './text'

export type ToastTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

export interface ToastProps {
  tone?: ToastTone
  title: string
  description?: string
  icon?: Icon
  /** Joueur à l'origine du message : remplace l'icône. */
  actor?: Pick<AvatarProps, 'name' | 'src' | 'tier'>
  /** Opération en cours (`toast.loading`, `toast.promise`) : un spinner remplace l'icône. */
  loading?: boolean
  /** Rend tout le toast touchable (chevron à droite). Pas de bouton d'action dans un toast. */
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** Icône (ou spinner, avatar) à taille unique : tous les toasts ont la même hauteur. */
const ICON = 32
/** Deux lignes de texte (titre sur deux lignes, ou titre et description) et les marges : hauteur commune. */
const HEIGHT = tokens.space[4] * 2 + tokens.typography.callout.lineHeight * 2

/** Contenu d'un toast, toujours sur deux lignes au plus : titre (deux lignes, ou une avec la description). Le comportement (file, minuterie, balayage) est dans `ToastHost`. */
export function Toast({ tone = 'neutral', title, description, icon, actor, loading = false, onPress, style }: ToastProps) {
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

  const content = (
    <>
      {loading ? (
        <Spinner size={ICON} color={colors.muted} />
      ) : actor ? (
        <Avatar {...actor} size="sm" decorative />
      ) : (
        <IconComponent size={ICON} weight={regular ? 'regular' : 'fill'} color={color} />
      )}
      <View style={{ flex: 1, minWidth: 0, gap: tokens.space[1] }}>
        <Text variant="callout" weight="600" numberOfLines={description ? 1 : 2}>
          {title}
        </Text>
        {description && (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>
      {onPress && <CaretRightIcon size={16} color={colors.muted} />}
    </>
  )

  const box: ViewStyle = {
    alignSelf: 'stretch',
    maxWidth: 358,
    minHeight: HEIGHT,
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
    <View accessibilityRole="alert" accessibilityLabel={label} style={[box, style]}>
      {content}
    </View>
  )
}
