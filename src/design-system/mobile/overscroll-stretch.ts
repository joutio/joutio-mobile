import { Platform } from 'react-native'
import { usePanGesture, useNativeGesture, useSimultaneousGestures } from 'react-native-gesture-handler'
import { useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated'

/** Ressort du retour de l'image, comme le rebond d'iOS. */
const SPRING = { damping: 26, stiffness: 260, mass: 1 }

/** Résistance d'UIScrollView : quasi libre au départ, de plus en plus dure. */
function rubberBand(distance: number, dimension: number) {
  'worklet'
  const c = 0.55
  return (1 - 1 / ((distance * c) / dimension + 1)) * dimension
}

/**
 * Tiré en haut de page sur **Android** (2026-11-07) : un `ScrollView` Android ne descend jamais sous 0, l'image de
 * l'en-tête ne pouvait donc pas zoomer comme au rebond d'iOS. Ce pan observe les touches
 * en simultané avec le geste natif, laissant le défilement et le pull-to-refresh intacts, et renvoie une traction
 * (`pull`, pt après résistance) tant que la page est en haut et que le doigt descend. L'appelant lit
 * `scroll - pull` à la place du défilement. Sur iOS, rien : le rebond natif donne déjà un défilement négatif.
 */
export function useOverscrollStretch(scroll: SharedValue<number>, dimension = 600) {
  const pull = useSharedValue(0)
  const startY = useSharedValue(Number.NaN)
  const startX = useSharedValue(0)
  const release = () => {
    'worklet'
    startY.value = Number.NaN
    if (pull.value !== 0) pull.value = withSpring(0, SPRING)
  }
  const pan = usePanGesture({
    enabled: Platform.OS === 'android',
    activeOffsetY: [-4, 4],
    failOffsetX: [-12, 12],
    onTouchesDown: (event) => {
      'worklet'
      startY.value = Number.NaN
      const touch = event.allTouches[0]
      if (!touch) return
      startX.value = touch.absoluteX
      if (scroll.value <= 0) startY.value = touch.absoluteY
    },
    onTouchesMove: (event) => {
      'worklet'
      const touch = event.allTouches[0]
      if (!touch) return
      if (scroll.value > 0) {
        // La page a défilé : la traction repart du doigt quand elle reviendra en haut.
        startY.value = Number.NaN
        pull.value = 0
        return
      }
      if (Number.isNaN(startY.value)) startY.value = touch.absoluteY
      const over = touch.absoluteY - startY.value
      // Balayage horizontal (pager d'onglets, rail) : pas de zoom.
      if (Math.abs(touch.absoluteX - startX.value) > Math.max(24, over)) {
        pull.value = 0
        return
      }
      pull.value = over > 0 ? rubberBand(over, dimension) : 0
    },
    onTouchesUp: release,
    onTouchesCancel: release,
  })
  // The native scroll/refresh may activate while this observer is still BEGAN.
  // Keep both simultaneous so Android does not cancel the touch observation.
  const native = useNativeGesture({ enabled: Platform.OS === 'android', disallowInterruption: false })
  const gesture = useSimultaneousGestures(pan, native)
  return { pan: gesture, pull }
}
