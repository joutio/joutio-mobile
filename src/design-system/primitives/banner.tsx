import { View, type StyleProp, type ViewStyle } from 'react-native'
import { ArrowClockwiseIcon, CheckCircleIcon, InfoIcon, RobotIcon, SwordIcon, WifiSlashIcon, type Icon } from '../icons'
import { mix } from '../theme/color'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Button } from './button'
import { Text } from './text'

export type BannerTone = 'error' | 'success' | 'info' | 'live' | 'training'

/** États de la bannière de connexion globale (`etats-systeme.md`) : réseau et temps réel. */
export type BannerConnection = 'offline' | 'reconnecting' | 'retrying' | 'failed' | 'restored'

const CONNECTION: Record<BannerConnection, { title: string; message: string; icon: Icon }> = {
  offline: { title: 'Pas de connexion', message: 'Tout se met à jour dès ton retour en ligne.', icon: WifiSlashIcon },
  reconnecting: { title: 'Reconnexion…', message: 'Le temps réel reprend dans un instant.', icon: ArrowClockwiseIcon },
  retrying: { title: 'Nouvelle tentative…', message: 'On vérifie ta connexion.', icon: WifiSlashIcon },
  failed: { title: 'Toujours hors connexion', message: 'Vérifie ton réseau, puis réessaie.', icon: WifiSlashIcon },
  restored: { title: 'Connexion rétablie', message: 'Tout est à jour.', icon: CheckCircleIcon },
}

type BannerAction = { label: string; onPress?: () => void; loading?: boolean }

type Common = {
  /** Safe area haute portée par la bande : elle remonte sous la barre d'état (`feedback.md`). */
  safeTop?: number
  style?: StyleProp<ViewStyle>
}

export type BannerProps = Common &
  (
    | {
        /** Bannière de connexion : textes, icône, ton et Réessayer viennent de l'état. */
        connection: BannerConnection
        onRetry?: () => void
        tone?: never
        title?: never
        message?: never
        icon?: never
        action?: never
      }
    | {
        connection?: never
        onRetry?: never
        tone?: BannerTone
        title: string
        message?: string
        icon?: Icon
        /** `loading` : nouvelle tentative en cours (roue, bouton inactif). */
        action?: BannerAction
      }
  )

/**
 * Bande pleine largeur, tout en haut de la fenêtre, au-dessus de la barre du haut qu'elle pousse vers le bas
 * (`design/specs/components/feedback.md`, 2026-11-11). Pas une carte : ni rayon ni marge, un filet en bas. Elle porte
 * la safe area haute (`safeTop`). Avec `connection`, c'est la bannière de connexion globale. Dans le flux de l'écran,
 * utiliser `Notice`.
 */
export function Banner(props: BannerProps) {
  const { colors } = useTheme()
  let tone: BannerTone
  let title: string
  let message: string | undefined
  let icon: Icon | undefined
  let action: BannerAction | undefined
  if (props.connection) {
    const restored = props.connection === 'restored'
    ;({ title, message, icon } = CONNECTION[props.connection])
    tone = restored ? 'success' : 'error'
    action = restored ? undefined : { label: 'Réessayer', onPress: props.onRetry, loading: props.connection === 'retrying' }
  } else {
    ;({ title, message, icon, action } = props)
    tone = props.tone ?? 'error'
  }
  // Teinte posée sur `bg` : la bande reste opaque sous la barre d'état.
  const tones = {
    error: { icon: WifiSlashIcon, iconColor: colors.wrong, background: mix(colors.wrong, colors.bg, 0.12), filledAction: false, fill: false },
    success: { icon: CheckCircleIcon, iconColor: colors.correct, background: mix(colors.correct, colors.bg, 0.12), filledAction: false, fill: true },
    info: { icon: InfoIcon, iconColor: colors.muted, background: colors.raised, filledAction: false, fill: false },
    live: { icon: SwordIcon, iconColor: colors.accentInk, background: colors.warm, filledAction: true, fill: true },
    training: { icon: RobotIcon, iconColor: colors.accentInk, background: colors.warm, filledAction: false, fill: false },
  }[tone]
  const IconComponent = icon ?? tones.icon

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : 'summary'}
      accessibilityLiveRegion="polite"
      style={[
        {
          alignSelf: 'stretch',
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          minHeight: 56 + (props.safeTop ?? 0),
          paddingTop: (props.safeTop ?? 0) + tokens.space[3],
          paddingBottom: tokens.space[3],
          paddingLeft: tokens.space[5],
          paddingRight: tokens.space[4],
          backgroundColor: tones.background,
          borderBottomWidth: HAIRLINE,
          borderBottomColor: tone === 'training' ? colors.accent : colors.border,
        },
        props.style,
      ]}
    >
      <IconComponent size={22} weight={tones.fill ? 'fill' : 'regular'} color={tones.iconColor} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="callout" weight="600" numberOfLines={1} color={tone === 'training' ? 'accentInk' : 'text'}>
          {title}
        </Text>
        {message && (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {message}
          </Text>
        )}
      </View>
      {action && (
        <Button
          size="S"
          variant={tones.filledAction ? 'filled' : 'gray'}
          tone={tones.filledAction ? 'accent' : 'neutral'}
          loading={action.loading}
          onPress={action.onPress}
        >
          {action.label}
        </Button>
      )}
    </View>
  )
}
