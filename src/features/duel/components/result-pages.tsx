import { useEffect, type ReactNode } from 'react'
import { View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { useReducedMotion } from '@/design-system'

/**
 * Bascule entre deux pages, lente et amortie comme un carrousel (2026-11-12) : le `ScrollView` aimanté d'Android
 * (`snapToOffsets`) passait d'une page à l'autre presque instantanément.
 */
const SWITCH = { duration: 450, easing: Easing.bezier(0.25, 1, 0.5, 1), reduceMotion: ReduceMotion.Never }

export interface ResultPagesProps {
  /** Hauteur d'une page (celle du conteneur). */
  height: number
  /** Page affichée : 0 résultat, 1 Détails du duel. */
  page: number
  onPageChange: (page: number) => void
  /** Faux : une seule page, aucun geste. */
  enabled: boolean
  children: [ReactNode, ReactNode | null]
}

/**
 * Pages verticales du résultat (Gesture Handler + Reanimated, sans rendu React par frame). Le doigt déplace les pages ;
 * au relâcher, tout glissé non nul bascule dans sa direction, sans seuil ni condition de vitesse (décision du
 * 2026-11-10). Un glissé horizontal échoue tôt (`failOffsetX`) et reste au pager des questions de Détails du duel.
 */
export function ResultPages({ height, page, onPageChange, enabled, children }: ResultPagesProps) {
  const reduced = useReducedMotion()
  const translate = useSharedValue(-page * height)
  const start = useSharedValue(0)
  const last = enabled ? 1 : 0

  // Page voulue par l'écran (bouton « Détails du duel », retour) ou hauteur mesurée : animée, ou posée sous mouvement réduit.
  useEffect(() => {
    const target = -page * height
    if (reduced) {
      cancelAnimation(translate)
      translate.value = target
    } else {
      translate.value = withTiming(target, SWITCH)
    }
  }, [page, height, reduced, translate])

  const pan = usePanGesture({
    enabled,
    activeOffsetY: [-8, 8],
    failOffsetX: [-12, 12],
    onActivate: () => {
      'worklet'
      cancelAnimation(translate)
      start.value = translate.value
    },
    onUpdate: (event) => {
      'worklet'
      translate.value = Math.min(0, Math.max(-last * height, start.value + event.translationY))
    },
    onDeactivate: (event) => {
      'worklet'
      const current = Math.round(-start.value / height)
      const next = event.translationY < 0 ? Math.min(last, current + 1) : event.translationY > 0 ? Math.max(0, current - 1) : current
      translate.value = reduced ? -next * height : withTiming(-next * height, SWITCH)
      scheduleOnRN(onPageChange, next)
    },
  })

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translate.value }] }))
  const [first, second] = children

  return (
    <GestureDetector gesture={pan}>
      <View collapsable={false} style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View style={[{ height: height * (enabled ? 2 : 1) }, style]}>
          <View style={{ height }} accessibilityElementsHidden={page !== 0} importantForAccessibility={page !== 0 ? 'no-hide-descendants' : 'auto'}>
            {first}
          </View>
          {enabled && (
            <View style={{ height }} accessibilityElementsHidden={page !== 1} importantForAccessibility={page !== 1 ? 'no-hide-descendants' : 'auto'}>
              {second}
            </View>
          )}
        </Animated.View>
      </View>
    </GestureDetector>
  )
}
