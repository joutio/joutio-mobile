import { useEffect } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, ZoomIn } from 'react-native-reanimated'
import WorldMap from '../../../assets/brand/world-map.svg'
import { UserIcon } from '../icons'
import { useReducedMotion } from '../motion'
import { Avatar } from '../primitives/avatar'
import { Text } from '../primitives/text'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { keyframe } from '../timeline'
import { tokens, type TierCode } from '../tokens.generated'

export interface MapPlayer {
  name: string
  lon: number
  lat: number
  tier?: TierCode
  src?: string
  /** Fond de l'avatar de base. */
  color?: string
}

export interface MatchmakingMapProps {
  state?: 'search' | 'found'
  /** Joueurs qui apparaissent pendant la recherche. */
  pins?: readonly MapPlayer[]
  /** Adversaire trouvé : la carte s'arrête sur lui. */
  opponent?: MapPlayer & { label?: string }
  /** Vitesse : 1 fait le tour de la carte en 90 s. */
  speed?: number
  /** Hauteur de la zone (la carte fait deux fois sa hauteur en largeur). */
  height: number
  width: number
  style?: StyleProp<ViewStyle>
}

const LOOP_MS = 90_000
/** Démarre sur l'Amérique plutôt que sur le Pacifique. */
const START = 0.25
const PIN_CYCLE_MS = 3360
const PIN_STAGGER_MS = 210

const longitude = (lon: number) => (lon + 180) / 360
const latitude = (lat: number) => (90 - lat) / 180

function Pin({ player, mapWidth, height, delay, found }: { player: MapPlayer; mapWidth: number; height: number; delay?: number; found?: boolean }) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const cycle = useSharedValue(found || reduced ? 0.5 : 0)

  useEffect(() => {
    if (found || reduced) return
    cycle.value = withDelay(
      delay ?? 0,
      withRepeat(withTiming(1, { duration: PIN_CYCLE_MS, easing: Easing.linear, reduceMotion: ReduceMotion.Never }), -1, false),
    )
  }, [cycle, delay, found, reduced])

  // `jo-map-pin` : surgit (15 %), tient, rétrécit et s'efface (70 → 85 %).
  const pop = useAnimatedStyle(() => {
    const scale = keyframe(cycle.value, [
      [0, 0],
      [0.15, 1],
      [0.7, 1],
      [0.85, 0.6],
      [1, 0],
    ])
    const opacity = keyframe(cycle.value, [
      [0, 0],
      [0.15, 1],
      [0.7, 1],
      [0.85, 0],
    ])
    return { opacity, transform: [{ scale }] }
  })

  return (
    <Animated.View
      entering={found && !reduced ? ZoomIn.springify() : undefined}
      style={[
        {
          position: 'absolute',
          left: longitude(player.lon) * mapWidth - 24,
          top: latitude(player.lat) * height - 60,
          width: 48,
          height: 60,
          transformOrigin: 'bottom',
        },
        pop,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 48,
          height: 48,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderBottomRightRadius: 24,
          borderBottomLeftRadius: 4,
          transform: [{ rotate: '-45deg' }],
          backgroundColor: player.tier ? tokens.tier[player.tier].hex : colors.accent,
          boxShadow: colors.shadow,
        }}
      />
      <View style={{ position: 'absolute', left: 5, top: 5 }}>
        {player.src ? (
          <Avatar name={player.name} src={player.src} size="md" decorative style={{ width: 38, height: 38 }} />
        ) : (
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: radius.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: player.color ?? colors.raised,
            }}
          >
            <UserIcon size={22} weight="fill" color={colors.onAccent} />
          </View>
        )}
      </View>
    </Animated.View>
  )
}

/** Fond de la recherche d'adversaire : défile en recherche, s'arrête sur l'adversaire trouvé. */
export function MatchmakingMap({ state = 'search', pins = [], opponent, speed = 3, height, width, style }: MatchmakingMapProps) {
  const { colors, radius } = useTheme()
  const reduced = useReducedMotion()
  const mapWidth = height * 2
  const found = state === 'found' && opponent
  const offset = useSharedValue(-START * mapWidth)

  useEffect(() => {
    if (found) {
      // Centre la carte sur l'adversaire, sur la copie qui laisse la carte déborder des deux côtés.
      const position = longitude(opponent.lon)
      const anchor = position < 0.5 ? position + 1 : position
      offset.value = withTiming(width / 2 - anchor * mapWidth, { duration: reduced ? 0 : tokens.motion.base.duration, reduceMotion: ReduceMotion.Never })
      return
    }
    if (reduced) return
    const duration = LOOP_MS / speed
    offset.value = -START * mapWidth
    offset.value = withRepeat(
      withTiming(-mapWidth - START * mapWidth, { duration: duration * (1 - START), easing: Easing.linear, reduceMotion: ReduceMotion.Never }),
      -1,
      false,
    )
  }, [found, opponent?.lon, mapWidth, width, speed, reduced, offset, opponent])

  const strip = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }))

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={found ? `Adversaire trouvé : ${opponent.name}` : 'Carte des joueurs'}
      style={[{ width, height, overflow: 'hidden', backgroundColor: colors.bg }, style]}
    >
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, width: mapWidth * 2, flexDirection: 'row' }, strip]}>
        {[0, 1].map((copy) => (
          <View key={copy} style={{ width: mapWidth, height }}>
            <WorldMap width={mapWidth} height={height} color={colors.raised} />
            {found ? (
              <Pin player={opponent} mapWidth={mapWidth} height={height} found />
            ) : (
              pins.map((player, index) => <Pin key={player.name} player={player} mapWidth={mapWidth} height={height} delay={index * PIN_STAGGER_MS} />)
            )}
          </View>
        ))}
      </Animated.View>
      {/* Bords fondus vers le fond (masque radial du lab). */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            experimental_backgroundImage: `radial-gradient(ellipse at center, transparent 35%, ${alpha(colors.bg, 0.1)} 50%, ${alpha(colors.bg, 0.4)} 68%, ${alpha(colors.bg, 0.75)} 86%, ${colors.bg} 100%)`,
          },
        ]}
      />
      {found && opponent.label && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, top: latitude(opponent.lat) * height + tokens.space[3], alignItems: 'center' }}
        >
          <View style={{ paddingHorizontal: tokens.space[3], paddingVertical: tokens.space[1], borderRadius: radius.sm, backgroundColor: colors.text }}>
            <Text variant="caption" weight="600" color="bg">
              {opponent.label}
            </Text>
          </View>
        </View>
      )}
    </View>
  )
}
