import { View, type StyleProp, type ViewStyle } from 'react-native'
import { InfoIcon, RobotIcon, SwordIcon, WifiSlashIcon, type Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Button } from './button'
import { Text } from './text'
import { hairlineRing } from '../theme/hairline'

export type BannerTone = 'error' | 'info' | 'live' | 'training'

export interface BannerProps {
  tone?: BannerTone
  title: string
  message?: string
  icon?: Icon
  action?: { label: string; onPress?: () => void }
  style?: StyleProp<ViewStyle>
}

/** Message dans la page : hors connexion, information, partie en cours, entraînement. */
export function Banner({ tone = 'error', title, message, icon, action, style }: BannerProps) {
  const { colors, radius } = useTheme()
  const tones = {
    error: { icon: WifiSlashIcon, iconColor: colors.wrong, background: colors.surface, ring: colors.border, filledAction: false, fill: false },
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
          onPress={action.onPress}
        >
          {action.label}
        </Button>
      )}
    </View>
  )
}
