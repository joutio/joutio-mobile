import { SvgXml } from 'react-native-svg'
import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { RankFrame } from '../brand/rank-frame'
import { LockSimpleIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Text } from './text'

export const AVATAR_SIZES = { xs: 24, sm: 32, md: 40, list: 44, row: 48, lg: 56, xl: 72, xxl: 88, preview: 140, hero: 176 } as const
export type AvatarSize = keyof typeof AVATAR_SIZES

/** Sous cette taille, le cadre illisible laisse la place à un filet. */
const FRAME_MIN_SIZE = 40

export type Presence = 'online' | 'ingame' | 'offline'

const PRESENCE_LABEL: Record<Presence, string> = { online: 'en ligne', ingame: 'en partie', offline: 'hors ligne' }

export interface AvatarProps {
  name: string
  /** URL, actif local (`require`) ou SVG en ligne (`<svg…`, avatar DiceBear). */
  src?: string | number
  size?: AvatarSize
  tier?: TierCode
  /** Classement non établi : filet pointillé, image désaturée. */
  provisional?: boolean
  /** Rang pas encore atteint. */
  locked?: boolean
  presence?: Presence
  /** Décoratif : le nom est déjà lu à côté (ligne de liste). */
  decorative?: boolean
  style?: StyleProp<ViewStyle>
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

export function Avatar({ name, src, size = 'md', tier, provisional = false, locked = false, presence, decorative = false, style }: AvatarProps) {
  const { colors, radius } = useTheme()
  const px = AVATAR_SIZES[size]

  // Un seul nom accessible : l'état n'est jamais porté par la seule couleur (kit § 6).
  const label = [
    name,
    tier && !provisional ? `rang ${tokens.tier[tier].label}` : undefined,
    provisional ? 'classement provisoire' : undefined,
    locked ? 'verrouillé' : undefined,
    presence ? PRESENCE_LABEL[presence] : undefined,
  ]
    .filter(Boolean)
    .join(', ')

  const svg = typeof src === 'string' && src.startsWith('<svg')
  const image = svg ? (
    <View style={{ flex: 1, overflow: 'hidden', borderRadius: radius.full, opacity: locked ? 0.55 : 1 }}>
      <SvgXml xml={src} width="100%" height="100%" />
    </View>
  ) : src ? (
    <Image
      source={typeof src === 'number' ? src : { uri: src }}
      contentFit="cover"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: radius.full,
        filter: locked ? [{ brightness: 0.55 }, { grayscale: 1 }] : provisional ? [{ saturate: 0.6 }] : undefined,
      }}
    />
  ) : (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.full,
        backgroundColor: colors.raised,
        opacity: locked ? 0.55 : 1,
      }}
    >
      <Text color="muted" weight="600" style={{ fontSize: Math.max(12, px * 0.36), lineHeight: Math.max(12, px * 0.36) * 1.1 }}>
        {initials(name)}
      </Text>
    </View>
  )

  const framed = tier && !provisional && px >= FRAME_MIN_SIZE

  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={decorative ? undefined : label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      accessibilityElementsHidden={decorative}
      style={[{ width: px, height: px }, style]}
    >
      {framed ? (
        <RankFrame tier={tier} size={px}>
          {image}
        </RankFrame>
      ) : (
        <View
          style={[
            { flex: 1, borderRadius: radius.full },
            // Anneau pointillé **à l'extérieur** (2026-11-07) : le visage garde toute sa taille, comme un avatar classé
            // (Profil et Fiche joueur à la même grandeur).
            provisional && { outlineWidth: 2, outlineStyle: 'dashed', outlineColor: colors.border, outlineOffset: 2 },
            tier && !provisional && { outlineWidth: 2, outlineStyle: 'solid', outlineColor: tokens.tier[tier].hex },
          ]}
        >
          {image}
        </View>
      )}
      {locked && (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: '30%',
            height: '30%',
            borderRadius: radius.full,
            backgroundColor: colors.text,
            borderWidth: 2,
            borderColor: colors.bg,
            boxSizing: 'content-box',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LockSimpleIcon weight="fill" size={px * 0.18} color={colors.bg} />
        </View>
      )}
      {presence && (
        <View
          style={{
            position: 'absolute',
            right: -2,
            bottom: -2,
            width: 10,
            height: 10,
            borderRadius: radius.full,
            backgroundColor: { online: colors.correct, ingame: colors.accent, offline: colors.muted }[presence],
            borderWidth: 2,
            borderColor: colors.bg,
            boxSizing: 'content-box',
          }}
        />
      )}
    </View>
  )
}
