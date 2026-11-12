import { useState } from 'react'
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { CaretRightIcon, type Icon } from '../icons'
import { mix } from '../theme/color'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Avatar, type Presence } from './avatar'
import { Button, type ButtonProps } from './button'
import { IconButton } from './icon-button'
import { PlayerName } from './player-name'
import { PressableScale } from './pressable-scale'
import { Spinner } from './spinner'
import { Text } from './text'

const PODIUM: Record<number, TierCode> = { 1: 'OR', 2: 'ARGENT', 3: 'BRONZE' }

export interface PlayerRowProps {
  name: string
  /** `PremiumBadge` après le pseudonyme. */
  premium?: boolean
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
  loading?: boolean
  disabled?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** L'action nomme le joueur, sauf si son libellé le fait déjà. */
const withName = (label: string, name: string) => (label.includes(name) ? label : `${label}, ${name}`)

/** Ligne de joueur (classement, contacts) : toute la ligne ouvre sa fiche, l'action reste à part. */
export function PlayerRow({
  name,
  premium = false,
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
  loading = false,
  disabled = false,
  style,
}: PlayerRowProps) {
  const { colors } = useTheme()
  const podium = rank === undefined ? undefined : PODIUM[rank]
  // iOS : la ligne pressée s'estompe ; Android : ripple natif sur toute la ligne, sans estompage.
  const [pressed, setPressed] = useState(false)
  const dimmed = pressed && Platform.OS !== 'android'
  return (
    <View
      style={[
        { minHeight: 64, justifyContent: 'center' },
        highlight && { backgroundColor: colors.warm },
        dimOffline && presence === 'offline' && { opacity: 0.5 },
        style,
      ]}
    >
      {/*
        La zone pressable couvre toute la ligne, sous le contenu : le ripple Android va d'un bord à l'autre. L'action
        reste au-dessus et répond seule (pas de bouton imbriqué dans un bouton).
      */}
      <PressableScale
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={[rank !== undefined ? `${rank}e` : undefined, name, sub, trail].filter(Boolean).join(', ')}
        disabled={!onPress || disabled || loading}
        pressedScale={1}
        ripple
        onPress={onPress}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={StyleSheet.absoluteFill}
      />
      <View
        pointerEvents="box-none"
        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[3], paddingHorizontal: tokens.space[5] }}
      >
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[4], opacity: dimmed ? 0.6 : 1 }}
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
            <PlayerName name={name} premium={premium} />
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
          {loading ? <Spinner size={20} color={colors.muted} /> : chevron && <CaretRightIcon size={20} color={colors.muted} />}
        </View>
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
      </View>
      {!last && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }} />}
    </View>
  )
}
