import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { LightningIcon, type Icon } from '../icons'
import { tokens, type TierCode } from '../tokens.generated'
import { LockBadge, LOCKED_STYLE } from './lock-badge'
import { MEDAL_ASSETS } from './tier-assets'

export interface TierMedalProps {
  tier: TierCode
  /** Icône de la famille du badge. */
  icon?: Icon
  /** Largeur en pt (hauteur ×1,1). */
  size?: number
  state?: 'earned' | 'locked'
  style?: StyleProp<ViewStyle>
}

/** Sous cette taille, le cadenas devient illisible. */
const LOCK_MIN_SIZE = 40

/** Médaille de palier, avec l'icône de sa famille au centre de l'écu. */
export function TierMedal({ tier, icon: IconComponent = LightningIcon, size = 56, state = 'earned', style }: TierMedalProps) {
  const locked = state === 'locked'
  const iconSize = size * 0.3
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Médaille ${tokens.tier[tier].label}${locked ? ', verrouillée' : ''}`}
      style={[{ width: size, height: size * 1.1 }, style]}
    >
      <View style={[{ flex: 1 }, locked && LOCKED_STYLE]}>
        <Image source={MEDAL_ASSETS[tier]} contentFit="contain" style={{ width: '100%', height: '100%' }} />
        <View style={{ position: 'absolute', left: (size - iconSize) / 2, top: size * 1.1 * 0.4545 - iconSize / 2 }}>
          <IconComponent weight="fill" size={iconSize} color={tokens.tier[tier].medalInk} />
        </View>
      </View>
      {locked && size >= LOCK_MIN_SIZE && <LockBadge size={size * 0.28} style={{ right: '4%', bottom: '6%' }} />}
    </View>
  )
}
