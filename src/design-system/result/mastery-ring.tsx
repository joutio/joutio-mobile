import { useEffect, useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Svg, { Circle } from 'react-native-svg'
import { useReducedMotion } from '../motion'
import { Text } from '../primitives/text'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'

const RADIUS = 65
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Remplissage de l'anneau et compteur « XP gagnée », solidaires, linéaires (`RING_REVEAL_MS`). */
const COUNT_DURATION = 1600

export interface MasteryRingProps {
  /** Palier affiché au centre. */
  tier: string
  /** Palier suivant. Absent au palier maximal. */
  next?: string
  gained: number
  remaining: number
  /** Diamètre en pt. */
  size?: number
  /** `pending` : XP pas encore connue, l'anneau reste vide. */
  state?: 'pending' | 'done'
  style?: StyleProp<ViewStyle>
}

/** Progression de l'animation (l'affichage seul ; les valeurs viennent des props). */
function useCountUp(key: string, pending: boolean, reduced: boolean) {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    if (pending) {
      setProgress(0)
      return
    }
    if (reduced) {
      setProgress(1)
      return
    }
    let frame = 0
    let start: number | undefined
    const tick = (now: number) => {
      start ??= now
      const value = Math.min(1, (now - start) / COUNT_DURATION)
      setProgress(value)
      if (value < 1) frame = requestAnimationFrame(tick)
    }
    setProgress(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [key, pending, reduced])
  return progress
}

/** Maîtrise du sujet après la partie : XP gagnée (arc ambre) et XP restante avant le palier suivant. */
export function MasteryRing({ tier, next, gained, remaining, size = 180, state = 'done', style }: MasteryRingProps) {
  const { colors } = useTheme()
  const reduced = useReducedMotion()
  const pending = state === 'pending'
  const progress = useCountUp(`${gained}/${remaining}`, pending, reduced)

  const total = gained + remaining
  const shownGained = Math.round(gained * progress)
  const percent = pending ? 0 : (total > 0 ? (gained / total) * 100 : 100) * progress
  const rad = Math.PI / 180
  // Ancrages des libellés sur l'anneau, comme le lab : XP gagnée à droite, restante à gauche.
  const gainedAngle = Math.max(36, 1.8 * percent) * rad
  const remainingAngle = Math.max(216, 180 + 1.8 * percent) * rad
  const line = Math.round(size * 0.14)
  const opacity = pending ? 0 : Math.min(1, progress / 0.25)
  const half = size / 2

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        pending
          ? `Maîtrise ${tier}, points d'expérience en cours de calcul`
          : `Maîtrise ${tier}, ${gained} points d'expérience gagnés, ${next ? `${remaining} avant ${next}` : 'palier max'}`
      }
      style={[{ alignSelf: 'stretch', height: size, alignItems: 'center' }, style]}
    >
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 160 160" style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle cx={80} cy={80} r={RADIUS} fill="none" stroke={colors.text} strokeWidth={30} />
          <Circle
            cx={80}
            cy={80}
            r={RADIUS}
            fill="none"
            stroke={colors.accent}
            strokeWidth={30}
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
          />
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: tokens.space[1] }}>
          <Text variant="caption" weight="600" color="muted">
            Maîtrise
          </Text>
          <Text variant="title2" weight="700">
            {tier}
          </Text>
        </View>
      </View>
      {/* Restante : à gauche, ancrée sur l'anneau. */}
      <View
        style={{
          position: 'absolute',
          right: '50%',
          marginRight: -half * Math.sin(remainingAngle),
          top: (1 - Math.cos(remainingAngle)) * half - 24,
          flexDirection: 'row',
          alignItems: 'center',
          opacity,
        }}
      >
        <View style={{ marginRight: tokens.space[3], alignItems: 'flex-end' }}>
          <Text variant="caption" weight="600" numberOfLines={1}>
            {next ? `Avant ${next}` : 'Palier max'}
          </Text>
          <Text variant="largeTitle" mono weight="600">
            {total - shownGained}
          </Text>
        </View>
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.text }} />
        <View style={{ width: line, height: 2, backgroundColor: colors.text }} />
      </View>
      {/* Gagnée : à droite. */}
      <View
        style={{
          position: 'absolute',
          left: '50%',
          marginLeft: half * Math.sin(gainedAngle),
          top: (1 - Math.cos(gainedAngle)) * half - 24,
          flexDirection: 'row',
          alignItems: 'center',
          opacity,
        }}
      >
        <View style={{ width: line, height: 2, backgroundColor: colors.accent }} />
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent }} />
        <View style={{ marginLeft: tokens.space[3] }}>
          <Text variant="caption" weight="600" color="accentInk" numberOfLines={1}>
            XP gagnée
          </Text>
          <Text variant="largeTitle" mono weight="600" color="accentInk">
            +{shownGained}
          </Text>
        </View>
      </View>
    </View>
  )
}
