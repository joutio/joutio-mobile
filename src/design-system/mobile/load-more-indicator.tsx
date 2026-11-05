import { ActivityIndicator, Platform, View } from 'react-native'
import Animated, { interpolate, useAnimatedProps, useAnimatedStyle, type SharedValue } from 'react-native-reanimated'
import Svg, { Circle } from 'react-native-svg'
import { useTheme } from '../theme/theme-provider'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export interface LoadMoreIndicatorProps {
  /** Traction courante (pt), sur le thread UI. */
  pull: SharedValue<number>
  threshold: number
  /** Requête en cours : l'indicateur natif de l'OS tourne. */
  loading: boolean
}

/**
 * Loader du `DragToLoadMore`, **celui de chaque OS** : pendant la traction, on dessine l'état déterminé du composant
 * natif (iOS : les rayons d'UIRefreshControl qui apparaissent un à un ; Android : le disque de SwipeRefreshLayout dont
 * l'arc grandit et tourne) ; pendant la requête, c'est l'`ActivityIndicator` natif qui tourne.
 */
export function LoadMoreIndicator(props: LoadMoreIndicatorProps) {
  return Platform.OS === 'android' ? <MaterialIndicator {...props} /> : <SpokesIndicator {...props} />
}

const SPOKES = 8
const SPOKE_LENGTH = 7
const SPOKE_WIDTH = 2.5
const SPOKES_RADIUS = 6

/** iOS : rayons d'UIActivityIndicatorView (medium), révélés dans le sens horaire avec la traction. */
function SpokesIndicator({ pull, threshold, loading }: LoadMoreIndicatorProps) {
  const { colors } = useTheme()
  if (loading) return <ActivityIndicator size="small" color={colors.muted} />
  return (
    <View style={{ width: 28, height: 28 }}>
      {Array.from({ length: SPOKES }, (_, index) => (
        <Spoke key={index} index={index} pull={pull} threshold={threshold} color={colors.muted} />
      ))}
    </View>
  )
}

function Spoke({ index, pull, threshold, color }: { index: number; pull: SharedValue<number>; threshold: number; color: string }) {
  const angle = (index * 360) / SPOKES
  const style = useAnimatedStyle(() => {
    // Chaque rayon s'allume sur son huitième de traction.
    const progress = (pull.value / threshold) * SPOKES - index
    return { opacity: interpolate(progress, [0, 1], [0, 1], 'clamp') }
  })
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: 14 - SPOKE_WIDTH / 2,
          top: 14 - SPOKES_RADIUS - SPOKE_LENGTH,
          width: SPOKE_WIDTH,
          height: SPOKE_LENGTH,
          borderRadius: SPOKE_WIDTH / 2,
          backgroundColor: color,
          // Pivot au centre de l'indicateur.
          transformOrigin: `${SPOKE_WIDTH / 2}px ${SPOKES_RADIUS + SPOKE_LENGTH}px`,
          transform: [{ rotate: `${angle}deg` }],
        },
        style,
      ]}
    />
  )
}

const DISC = 40
const RADIUS = 8.5
const STROKE = 2.5
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** Arc maximal au seuil, comme Material (80 % du tour). */
const MAX_SWEEP = 0.8

/** Android : disque Material de SwipeRefreshLayout, arc accent qui grandit et tourne avec la traction. */
function MaterialIndicator({ pull, threshold, loading }: LoadMoreIndicatorProps) {
  const { colors, radius } = useTheme()
  const arcProps = useAnimatedProps(() => {
    const progress = Math.min(1, pull.value / threshold)
    return { strokeDashoffset: CIRCUMFERENCE * (1 - progress * MAX_SWEEP), strokeOpacity: interpolate(progress, [0, 1], [0.35, 1]) }
  })
  const spin = useAnimatedStyle(() => ({ transform: [{ rotate: `${-90 + Math.min(1.4, pull.value / threshold) * 200}deg` }] }))
  return (
    <View
      style={{
        width: DISC,
        height: DISC,
        borderRadius: radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        elevation: 4,
      }}
    >
      {loading ? (
        <ActivityIndicator size={24} color={colors.accent} />
      ) : (
        <Animated.View style={spin}>
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <AnimatedCircle
              cx={12}
              cy={12}
              r={RADIUS}
              fill="none"
              stroke={colors.accent}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              animatedProps={arcProps}
            />
          </Svg>
        </Animated.View>
      )}
    </View>
  )
}
