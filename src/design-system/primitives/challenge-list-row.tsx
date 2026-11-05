import { View, type StyleProp, type ViewStyle } from 'react-native'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Avatar, type Presence } from './avatar'
import { Button } from './button'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export interface ChallengeAction {
  label: string
  onPress?: () => void
  disabled?: boolean
  loading?: boolean
}

export interface ChallengeListRowProps {
  name: string
  /** Sujet et délai restant, lus en entier : ils décident de la réponse. */
  sub?: string
  src?: string
  tier?: TierCode
  presence?: Presence
  /** À droite : Accepter, Relancer. */
  primary: ChallengeAction
  /** `filled` quand le joueur doit répondre, `tinted` sinon. */
  primaryVariant?: 'filled' | 'tinted'
  /** À gauche, en ton destructif : l'action met fin au défi (Refuser, Annuler). */
  secondary: ChallengeAction
  /** Toute la zone du joueur ouvre sa fiche. */
  onPress?: () => void
  last?: boolean
  style?: StyleProp<ViewStyle>
}

/** Défi en attente : le joueur, puis deux actions sur toute la largeur. */
export function ChallengeListRow({
  name,
  sub,
  src,
  tier,
  presence,
  primary,
  primaryVariant = 'filled',
  secondary,
  onPress,
  last = false,
  style,
}: ChallengeListRowProps) {
  const { colors } = useTheme()
  return (
    <View style={[{ gap: tokens.space[3], paddingBottom: tokens.space[4] }, style]}>
      {/* Zone du joueur : ripple d'un bord à l'autre ; les actions restent hors du bouton de la ligne. */}
      <PressableScale
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={[name, sub].filter(Boolean).join(', ')}
        disabled={!onPress}
        pressedScale={1}
        ripple
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingVertical: tokens.space[3],
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Avatar name={name} src={src} tier={tier} presence={presence} size="list" decorative />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="headline" numberOfLines={1}>
            {name}
          </Text>
          {sub && (
            <Text variant="caption" color="muted">
              {sub}
            </Text>
          )}
        </View>
      </PressableScale>
      <View style={{ flexDirection: 'row', gap: tokens.space[3], paddingHorizontal: tokens.space[5] }}>
        <View style={{ flex: 1 }}>
          <Button
            size="S"
            variant="tinted"
            tone="destructive"
            full
            disabled={secondary.disabled}
            loading={secondary.loading}
            onPress={secondary.onPress}
            accessibilityLabel={`${secondary.label}, ${name}`}
          >
            {secondary.label}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            size="S"
            variant={primaryVariant}
            tone="accent"
            full
            disabled={primary.disabled}
            loading={primary.loading}
            onPress={primary.onPress}
            accessibilityLabel={`${primary.label}, ${name}`}
          >
            {primary.label}
          </Button>
        </View>
      </View>
      {!last && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }} />}
    </View>
  )
}
