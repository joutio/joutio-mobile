import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CheckCircleIcon, InfoIcon, RobotIcon, SwordIcon, WifiSlashIcon, type Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Button } from './button'
import { Text } from './text'
import { hairlineRing } from '../theme/hairline'

export type NoticeTone = 'error' | 'success' | 'info' | 'live' | 'training'

export interface NoticeProps {
  tone?: NoticeTone
  title: string
  message?: string
  icon?: Icon
  /** `loading` : nouvelle tentative en cours (roue à la place de l'icône, bouton inactif). */
  action?: { label: string; onPress?: () => void; loading?: boolean }
  style?: StyleProp<ViewStyle>
}

/** Message persistant dans le flux de l'écran, en carte (`feedback.md`). En haut de la fenêtre, utiliser `Banner`. */
export function Notice({ tone = 'error', title, message, icon, action, style }: NoticeProps) {
  const { colors, radius } = useTheme()
  const tones = {
    error: { icon: WifiSlashIcon, iconColor: colors.wrong, background: colors.surface, ring: colors.border, filledAction: false, fill: false },
    success: { icon: CheckCircleIcon, iconColor: colors.correct, background: colors.surface, ring: colors.border, filledAction: false, fill: true },
    info: { icon: InfoIcon, iconColor: colors.muted, background: colors.surface, ring: colors.border, filledAction: false, fill: false },
    live: { icon: SwordIcon, iconColor: colors.accentInk, background: colors.warm, ring: colors.border, filledAction: true, fill: true },
    training: { icon: RobotIcon, iconColor: colors.accentInk, background: colors.warm, ring: colors.accent, filledAction: false, fill: false },
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
          paddingVertical: tokens.space[4],
          paddingRight: tokens.space[4],
          paddingLeft: 14,
          borderRadius: radius.md,
          backgroundColor: tones.background,
          boxShadow: hairlineRing(tones.ring),
        },
        style,
      ]}
    >
      <IconComponent size={24} weight={tones.fill ? 'fill' : 'regular'} color={tones.iconColor} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="callout" weight="600" color={tone === 'training' ? 'accentInk' : 'text'}>
          {title}
        </Text>
        {message && (
          <Text variant="caption" color="muted">
            {message}
          </Text>
        )}
      </View>
      {action && (
        <Button
          size="S"
          variant={tones.filledAction ? 'filled' : 'gray'}
          tone={tones.filledAction ? 'accent' : 'neutral'}
          style={{ alignSelf: 'center' }}
          loading={action.loading}
          onPress={action.onPress}
        >
          {action.label}
        </Button>
      )}
    </View>
  )
}
