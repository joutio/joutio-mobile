import { Image } from 'expo-image'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '../primitives/text'
import { tokens, type TierCode } from '../tokens.generated'
import { LockBadge, LOCKED_STYLE } from './lock-badge'
import { RIBBON_ASSETS } from './tier-assets'

export interface TitleRibbonProps {
  tier: TierCode
  text: string
  /** Largeur en pt. */
  width?: number
  state?: 'earned' | 'locked'
  style?: StyleProp<ViewStyle>
}

const RATIO = 56 / 220

/** Ruban d'un titre, le nom écrit dans la bande. */
export function TitleRibbon({ tier, text, width = 220, state = 'earned', style }: TitleRibbonProps) {
  const locked = state === 'locked'
  const height = width * RATIO
  const fontSize = Math.max(12, (width * 12) / 220)
  return (
    <View
      accessible
      // Nom complet, même quand le texte affiché est tronqué.
      accessibilityRole="image"
      accessibilityLabel={[`Titre ${tokens.tier[tier].label}`, text, locked && 'verrouillé'].filter(Boolean).join(', ')}
      style={[{ width, height }, style]}
    >
      <View style={[{ flex: 1 }, locked && LOCKED_STYLE]}>
        <Image source={RIBBON_ASSETS[tier]} contentFit="contain" style={{ width: '100%', height: '100%' }} />
        <Text
          numberOfLines={1}
          weight="700"
          align="center"
          maxFontSizeMultiplier={1}
          style={{
            position: 'absolute',
            left: width * 0.16,
            right: width * 0.16,
            top: height * 0.417 - fontSize / 2,
            fontSize,
            lineHeight: fontSize,
            color: tokens.tier[tier].ribbonInk,
          }}
        >
          {text}
        </Text>
      </View>
      {locked && <LockBadge size={height * 0.4} style={{ right: '12%', bottom: 0 }} />}
    </View>
  )
}
