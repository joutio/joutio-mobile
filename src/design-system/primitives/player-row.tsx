import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CaretRightIcon, type Icon } from '../icons'
import { mix } from '../theme/color'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Avatar, type Presence } from './avatar'
import { Button, type ButtonProps } from './button'
import { IconButton } from './icon-button'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

const PODIUM: Record<number, TierCode> = { 1: 'OR', 2: 'ARGENT', 3: 'BRONZE' }

export interface PlayerRowProps {
  name: string
  sub?: string
  src?: string
  tier?: TierCode
  presence?: Presence
  /** Place au classement. */
  rank?: number
  /** Valeur en mono à droite, par exemple un Elo. */
  trail?: string
  cta?: { label: string; variant?: ButtonProps['variant']; onPress?: () => void }
  ctaIcon?: { icon: Icon; label: string; onPress?: () => void }
  chevron?: boolean
  /** Ligne du joueur connecté. */
  highlight?: boolean
  /** Atténue un joueur hors ligne. */
  dimOffline?: boolean
  last?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** L'action nomme le joueur, sauf si son libellé le fait déjà. */
const withName = (label: string, name: string) => (label.includes(name) ? label : `${label}, ${name}`)

/** Ligne de joueur (classement, contacts) : toute la ligne ouvre sa fiche, l'action reste à part. */
export function PlayerRow({
  name,
  sub,
  src,
  tier,
  presence,
  rank,
  trail,
  cta,
  ctaIcon,
  chevron = false,
  highlight = false,
  dimOffline = false,
  last = false,
  onPress,
  style,
}: PlayerRowProps) {
  const { colors } = useTheme()
  const podium = rank === undefined ? undefined : PODIUM[rank]
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingRight: cta || ctaIcon ? tokens.space[5] : 0 },
        highlight && { backgroundColor: colors.warm },
        dimOffline && presence === 'offline' && { opacity: 0.5 },
        style,
      ]}
    >
      {/* Les actions restent hors de la ligne pressable, pour ne pas imbriquer deux boutons. */}
      <PressableScale
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={[rank !== undefined ? `${rank}e` : undefined, name, sub, trail].filter(Boolean).join(', ')}
        disabled={!onPress}
        pressedScale={1}
        ripple
        onPress={onPress}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          paddingVertical: tokens.space[3],
          paddingLeft: tokens.space[5],
          paddingRight: cta || ctaIcon ? 0 : tokens.space[5],
          opacity: pressed ? 0.6 : 1,
        })}
      >
        {rank !== undefined && (
          <Text
            variant="headline"
            mono
            align="center"
            color={podium ? mix(tokens.tier[podium].hex, colors.text, 0.5) : 'muted'}
            style={{ width: 28 }}
            maxFontSizeMultiplier={1.2}
          >
            {rank}
          </Text>
        )}
        <Avatar name={name} src={src} tier={tier} presence={presence} size="list" decorative />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="headline" numberOfLines={1}>
            {name}
          </Text>
          {sub && (
            <Text variant="caption" color="muted" numberOfLines={1}>
              {sub}
            </Text>
          )}
        </View>
        {trail && (
          <Text variant="callout" weight="600" mono>
            {trail}
          </Text>
        )}
        {chevron && <CaretRightIcon size={20} color={colors.muted} />}
      </PressableScale>
      {cta && (
        <Button
          size="S"
          variant={cta.variant ?? 'gray'}
          tone={(cta.variant ?? 'gray') === 'filled' ? 'accent' : 'neutral'}
          onPress={cta.onPress}
          accessibilityLabel={withName(cta.label, name)}
        >
          {cta.label}
        </Button>
      )}
      {ctaIcon && !cta && <IconButton icon={ctaIcon.icon} label={withName(ctaIcon.label, name)} variant="tinted" tone="accent" onPress={ctaIcon.onPress} />}
      {!last && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }} />}
    </View>
  )
}
