import { useEffect, useMemo, useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
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
      arcOffset: -(start * CIRCUMFERENCE + SEGMENT_GAP / 2),
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

/** Avancement de 0 à 1 (ease-out cubique), lancé par `play` ; immédiat sous mouvement réduit. */
function useReveal(play: boolean) {
  const reduced = useReducedMotion()
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (!play) return
    if (reduced) {
      setProgress(1)
      return
    }
    let frame = 0
    let start: number | undefined
    const tick = (now: number) => {
      start ??= now
      const value = Math.min(1, (now - start) / REVEAL_MS)
      setProgress(1 - (1 - value) ** 3)
      if (value < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [play, reduced])
  return progress
}

/** Répartition par sujet : parts colorées, compteur dans chaque part, libellés reliés à l'anneau. */
export function TopicsDonut({ data, label, maxSegments = 6, otherLabel = 'Autres', play = true, style }: TopicsDonutProps) {
  const { colors } = useTheme()
  const segments = useMemo(() => plan(data, maxSegments, otherLabel, colors.border), [data, maxSegments, otherLabel, colors.border])
  const progress = useReveal(play)
  const reveal = clamp((progress - 0.6) / 0.4, 0, 1)
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
              <Circle
                key={segment.key}
                cx={50}
                cy={50}
                r={R_MID}
                fill="none"
                stroke={segment.color}
                strokeWidth={R_OUTER - R_INNER}
                strokeDasharray={`${segment.arcLength * progress} ${CIRCUMFERENCE - segment.arcLength * progress}`}
                strokeDashoffset={segment.arcOffset}
                transform="rotate(-90 50 50)"
              />
            ))}
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
                  opacity={reveal}
                >
                  {String(Math.round(segment.value * progress))}
                </SvgText>
              ))}
            {segments.map((segment) => {
              const side = segment.zone === 'left' || segment.zone === 'right'
              const endX = side ? segment.labelX + (segment.zone === 'right' ? -LEADER_GAP : LEADER_GAP) : segment.labelX
              const endY = side ? segment.labelY : segment.labelY + (segment.zone === 'top' ? 5 : -5)
              const ink = segment.key === OTHER_KEY ? colors.muted : segment.color
              return (
                <G key={segment.key} opacity={reveal}>
                  <Line x1={segment.dot.x} y1={segment.dot.y} x2={endX} y2={endY} stroke={ink} strokeWidth={0.6} strokeLinecap="round" />
                  <Circle cx={segment.dot.x} cy={segment.dot.y} r={1} fill={ink} />
                </G>
              )
            })}
          </Svg>
          {segments.map((segment) => {
            const side = segment.zone === 'left' || segment.zone === 'right'
            const boxWidth = (width * (side ? LABEL_WIDTH : 32)) / 100
            const left = segment.zone === 'left' ? 0 : (width * segment.labelX) / 100 - (side ? 0 : boxWidth / 2)
            const top = ((segment.labelY - CROP_TOP) * height) / CROP_HEIGHT
            return (
              <View
                key={segment.key}
                pointerEvents="none"
                style={{ position: 'absolute', left, top, width: boxWidth, transform: [{ translateY: '-50%' }], opacity: reveal }}
              >
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
        </>
      )}
    </View>
  )
}
