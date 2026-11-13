import { memo, useEffect, useMemo, useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg'
import { useReducedMotion } from '../motion'
import { useTheme } from '../theme/theme-provider'
import { fontFace } from '../theme/fonts'
import { Text } from './text'

/* Géométrie dans une boîte de 100 × 100 unités, le viewBox du SVG (reprise du lab). */
const R_OUTER = 23
const R_INNER = 14
const R_MID = (R_OUTER + R_INNER) / 2
const CIRCUMFERENCE = 2 * Math.PI * R_MID
const SEGMENT_GAP = 1.3
const LABEL_RIGHT = 80
const LABEL_LEFT = 20
const LABEL_WIDTH = 20
const LEADER_GAP = 2
const COUNT_MIN_SHARE = 0.04
const REVEAL_MS = 900
const OTHER_KEY = '__other__'
/** Hauteur utile : le vide au-dessus et au-dessous de l'anneau est recadré. */
const CROP_TOP = 8
const CROP_HEIGHT = 84
const MAX_WIDTH = 390

export interface TopicsDonutDatum {
  key: string
  label: string
  value: number
  /** Couleur éditoriale du sujet. */
  color: string
}

export interface TopicsDonutProps {
  data: readonly TopicsDonutDatum[]
  /** Nom du graphique pour les lecteurs d'écran. */
  label: string
  /** Parts au plus, « Autres » comprise. */
  maxSegments?: number
  otherLabel?: string
  /** Lance le dessin de l'anneau (graphique sous le pli : à son entrée dans la vue). */
  play?: boolean
  style?: StyleProp<ViewStyle>
}

type Zone = 'top' | 'right' | 'bottom' | 'left'

const polar = (radius: number, degrees: number) => {
  const angle = (degrees * Math.PI) / 180
  return { x: 50 + radius * Math.sin(angle), y: 50 - radius * Math.cos(angle) }
}

const zoneOf = (angle: number): Zone => (angle <= 40 || angle >= 320 ? 'top' : angle < 140 ? 'right' : angle <= 220 ? 'bottom' : 'left')

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

function plan(data: readonly TopicsDonutDatum[], maxSegments: number, otherLabel: string, otherColor: string) {
  const played = data.filter((datum) => datum.value > 0).sort((a, b) => b.value - a.value)
  const total = played.reduce((sum, datum) => sum + datum.value, 0)
  if (total === 0) return []
  const overflow = played.length > maxSegments
  const kept = overflow ? played.slice(0, maxSegments - 1) : played
  const rest = overflow ? played.slice(maxSegments - 1).reduce((sum, datum) => sum + datum.value, 0) : 0
  const parts = rest > 0 ? [...kept, { key: OTHER_KEY, label: otherLabel, value: rest, color: otherColor }] : kept

  let start = 0
  const segments = parts.map((part) => {
    const fraction = part.value / total
    const angle = (start + fraction / 2) * 360
    const segment = {
      ...part,
      fraction,
      zone: zoneOf(angle),
      arcLength: Math.max(0, fraction * CIRCUMFERENCE - SEGMENT_GAP),
      /* Chaque part est son propre cercle, tourné pour que son tracé commence au début de la part. */
      arcRotation: -90 + (start + SEGMENT_GAP / 2 / CIRCUMFERENCE) * 360,
      count: polar(R_MID, angle),
      dot: polar(R_OUTER + 0.8, angle),
      labelX: 50,
      labelY: 50 - R_OUTER * Math.cos((angle * Math.PI) / 180),
      angle,
    }
    start += fraction
    return segment
  })

  for (const side of ['left', 'right'] as const) {
    const column = segments.filter((segment) => segment.zone === side).sort((a, b) => a.labelY - b.labelY)
    column.forEach((segment, index) => {
      segment.labelX = side === 'right' ? LABEL_RIGHT : LABEL_LEFT
      const previous = column[index - 1]
      segment.labelY = previous ? Math.max(segment.labelY, previous.labelY + 11) : clamp(segment.labelY, 12, 88)
    })
    const last = column[column.length - 1]
    const excess = last ? last.labelY - 88 : 0
    if (excess > 0)
      column.forEach((segment) => {
        segment.labelY -= excess
      })
  }
  for (const zone of ['top', 'bottom'] as const) {
    const row = segments.filter((segment) => segment.zone === zone).sort((a, b) => a.angle - b.angle)
    const step = row.length > 1 ? Math.min(36, 72 / (row.length - 1)) : 0
    row.forEach((segment, index) => {
      segment.labelX = clamp(50 + (index - (row.length - 1) / 2) * step, 12, 88)
      segment.labelY = zone === 'top' ? 15 : 85
    })
  }
  return segments
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)
const AnimatedG = Animated.createAnimatedComponent(G)

/**
 * Avancement de 0 à 1 (ease-out cubique) sur le thread UI, lancé une seule fois par `play` : revenir sur l'onglet ne
 * rejoue pas le dessin. Immédiat sous mouvement réduit. Aucun rendu React par frame.
 */
function useReveal(play: boolean) {
  const reduced = useReducedMotion()
  const progress = useSharedValue(0)
  useEffect(() => {
    if (!play || progress.value > 0) return
    progress.value = reduced ? 1 : withTiming(1, { duration: REVEAL_MS, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.Never })
  }, [play, reduced, progress])
  return progress
}

/**
 * Une part : tiret de sa longueur suivi d'un vide plus long que le cercle. Le décalage fait avancer le tiret depuis
 * le début de la part, si bien que seul `strokeDashoffset` (un nombre) est animé.
 */
function Arc({ color, length, rotation, progress }: { color: string; length: number; rotation: number; progress: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.value) }))
  return (
    <AnimatedCircle
      cx={50}
      cy={50}
      r={R_MID}
      fill="none"
      stroke={color}
      strokeWidth={R_OUTER - R_INNER}
      strokeDasharray={`${length} ${CIRCUMFERENCE}`}
      animatedProps={animatedProps}
      transform={`rotate(${rotation} 50 50)`}
    />
  )
}

/** Répartition par sujet : parts colorées, compteur dans chaque part, libellés reliés à l'anneau. */
export const TopicsDonut = memo(function TopicsDonut({ data, label, maxSegments = 6, otherLabel = 'Autres', play = true, style }: TopicsDonutProps) {
  const { colors } = useTheme()
  const segments = useMemo(() => plan(data, maxSegments, otherLabel, colors.border), [data, maxSegments, otherLabel, colors.border])
  const progress = useReveal(play)
  // Compteurs, traits et libellés apparaissent en fondu sur la fin du dessin.
  const reveal = useDerivedValue(() => Math.max(0, Math.min(1, (progress.value - 0.6) / 0.4)))
  const revealProps = useAnimatedProps(() => ({ opacity: reveal.value }))
  const revealStyle = useAnimatedStyle(() => ({ opacity: reveal.value }))
  const [width, setWidth] = useState(0)
  const height = (width * CROP_HEIGHT) / 100
  const summary = `${label} : ${segments.map((segment) => `${segment.label} ${segment.value}`).join(', ')}`

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={summary}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[{ alignSelf: 'center', width: '100%', maxWidth: MAX_WIDTH, aspectRatio: 100 / CROP_HEIGHT }, style]}
    >
      {width > 0 && (
        <>
          <Svg width={width} height={height} viewBox={`0 ${CROP_TOP} 100 ${CROP_HEIGHT}`} style={{ position: 'absolute', overflow: 'visible' }}>
            {segments.map((segment) => (
              <Arc key={segment.key} color={segment.color} length={segment.arcLength} rotation={segment.arcRotation} progress={progress} />
            ))}
            <AnimatedG animatedProps={revealProps}>
              {segments
                .filter((segment) => segment.fraction >= COUNT_MIN_SHARE)
                .map((segment) => (
                  <SvgText
                    key={segment.key}
                    x={segment.count.x}
                    y={segment.count.y + 1.5}
                    textAnchor="middle"
                    fontSize={4.4}
                    fontFamily={fontFace('GeistMono', '700')}
                    fill={segment.key === OTHER_KEY ? colors.text : colors.onAccent}
                  >
                    {String(segment.value)}
                  </SvgText>
                ))}
              {segments.map((segment) => {
                const side = segment.zone === 'left' || segment.zone === 'right'
                const endX = side ? segment.labelX + (segment.zone === 'right' ? -LEADER_GAP : LEADER_GAP) : segment.labelX
                const endY = side ? segment.labelY : segment.labelY + (segment.zone === 'top' ? 5 : -5)
                const ink = segment.key === OTHER_KEY ? colors.muted : segment.color
                return (
                  <G key={segment.key}>
                    <Line x1={segment.dot.x} y1={segment.dot.y} x2={endX} y2={endY} stroke={ink} strokeWidth={0.6} strokeLinecap="round" />
                    <Circle cx={segment.dot.x} cy={segment.dot.y} r={1} fill={ink} />
                  </G>
                )
              })}
            </AnimatedG>
          </Svg>
          <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }, revealStyle]}>
            {segments.map((segment) => {
              const side = segment.zone === 'left' || segment.zone === 'right'
              const boxWidth = (width * (side ? LABEL_WIDTH : 32)) / 100
              const left = segment.zone === 'left' ? 0 : (width * segment.labelX) / 100 - (side ? 0 : boxWidth / 2)
              const top = ((segment.labelY - CROP_TOP) * height) / CROP_HEIGHT
              return (
                <View key={segment.key} style={{ position: 'absolute', left, top, width: boxWidth, transform: [{ translateY: '-50%' }] }}>
                  <Text
                    variant="caption"
                    weight="600"
                    align={segment.zone === 'left' ? 'right' : segment.zone === 'right' ? 'left' : 'center'}
                    textBreakStrategy="balanced"
                  >
                    {segment.label}
                  </Text>
                </View>
              )
            })}
          </Animated.View>
        </>
      )}
    </View>
  )
})
