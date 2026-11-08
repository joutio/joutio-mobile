import { Image } from 'expo-image'
import { useId, useState } from 'react'
import { PixelRatio, View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Defs, Image as SvgImage, Pattern, Rect } from 'react-native-svg'
import { Text } from '../primitives/text'
import { tokens, type TierCode } from '../tokens.generated'
import { LockBadge, LOCKED_STYLE } from './lock-badge'
import { RIBBON_ASSETS, RIBBON_PART_ASSETS } from './tier-assets'

export interface TitleRibbonProps {
  tier: TierCode
  text: string
  /** Largeur imposée en pt, ou largeur intrinsèque du texte sans troncature. */
  width?: number | 'auto'
  state?: 'earned' | 'locked'
  style?: StyleProp<ViewStyle>
}

// SVG source : 940 × 240, extrémités de 340 et 300, motif périodique de 100.
const SCALE = 56 / 240
const LEFT = 340 * SCALE
const RIGHT = 300 * SCALE
const TILE = 100 * SCALE
const BASE = 940 * SCALE
const PADDING = 52
const SEAM = 1 / PixelRatio.get()

/** Extrémités fixes, centre répété : ni le motif ni le texte ne sont étirés. */
export function TitleRibbon({ tier, text, width = 220, state = 'earned', style }: TitleRibbonProps) {
  const locked = state === 'locked'
  const auto = width === 'auto'
  const [textWidth, setTextWidth] = useState(0)
  const patternId = `ribbon${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  // Des répétitions entières raccordent le motif à la même phase sur les deux bouts.
  const naturalWidth = LEFT + RIGHT + Math.max(3, Math.ceil((textWidth + PADDING * 2 - LEFT - RIGHT) / TILE)) * TILE
  const boxWidth = auto ? undefined : width
  const extended = auto || width > 220
  const height = extended ? 56 : width * (56 / 220)
  const [layoutWidth, setLayoutWidth] = useState(BASE)
  const drawnWidth = auto ? layoutWidth : width
  const parts = RIBBON_PART_ASSETS[tier]
  const textStyle = { fontSize: 12, lineHeight: 14, color: tokens.tier[tier].ribbonInk } as const

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={[`Titre ${tokens.tier[tier].label}`, text, locked && 'verrouillé'].filter(Boolean).join(', ')}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      style={[{ width: boxWidth, minWidth: auto ? naturalWidth : undefined, height, alignSelf: 'flex-start' }, style]}
    >
      <View style={[{ flex: 1, alignItems: 'center' }, locked && LOCKED_STYLE]}>
        {extended ? (
          <Svg width="100%" height={height} style={{ position: 'absolute' }}>
            <Defs>
              <Pattern id={patternId} x={LEFT} y={0} width={TILE} height={height} patternUnits="userSpaceOnUse">
                <SvgImage href={parts.center} x={0} y={0} width={TILE} height={height} preserveAspectRatio="none" />
              </Pattern>
            </Defs>
            <Rect x={LEFT - SEAM} y={0} width={Math.max(0, drawnWidth - LEFT - RIGHT) + SEAM * 2} height={height} fill={`url(#${patternId})`} />
            <SvgImage href={parts.left} x={0} y={0} width={LEFT} height={height} preserveAspectRatio="none" />
            <SvgImage href={parts.right} x={drawnWidth - RIGHT} y={0} width={RIGHT} height={height} preserveAspectRatio="none" />
          </Svg>
        ) : (
          <Image source={RIBBON_ASSETS[tier]} contentFit="contain" style={{ position: 'absolute', width: '100%', height: '100%' }} />
        )}
        <Text
          numberOfLines={1}
          weight="700"
          align="center"
          maxFontSizeMultiplier={1}
          onLayout={auto ? (event) => setTextWidth(event.nativeEvent.layout.width) : undefined}
          style={
            auto
              ? { ...textStyle, marginHorizontal: PADDING, marginTop: height * (100 / 240) - 7, flexShrink: 0 }
              : {
                  ...textStyle,
                  position: 'absolute',
                  left: extended ? PADDING : width * 0.16,
                  right: extended ? PADDING : width * 0.16,
                  top: height * (100 / 240) - 7,
                }
          }
        >
          {text}
        </Text>
      </View>
      {locked && <LockBadge size={height * 0.4} style={{ right: extended ? 26 : '12%', bottom: 0 }} />}
    </View>
  )
}
