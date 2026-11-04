import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import {
  cancelAnimation,
  Easing,
  ReduceMotion,
  withRepeat,
  withSpring,
  withTiming,
  type SharedValue,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { tokens } from './tokens.generated'

export type MotionName = keyof typeof tokens.motion

/** Remplace `prefers-reduced-motion` : suit le réglage système en direct. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => active && setReduced(value))
      .catch(() => undefined)
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])
  return reduced
}

/** `{ type: 'bezier' | 'linear' }` → config `withTiming`. Le mouvement réduit est géré par l'appelant. */
export function timing(name: MotionName, duration?: number): WithTimingConfig {
  const { easing, duration: base } = tokens.motion[name]
  const fn = easing.type === 'bezier' ? Easing.bezier(easing.points[0], easing.points[1], easing.points[2], easing.points[3]) : Easing.linear
  return { duration: duration ?? base, easing: fn, reduceMotion: ReduceMotion.Never }
}

/**
 * `{ type: 'spring', response, dampingRatio }` (vocabulaire iOS) → ressort physique Reanimated, masse 1 :
 * raideur = (2π / response)², amortissement = 4π · dampingRatio / response.
 */
export function spring(name: MotionName = 'sheet'): WithSpringConfig {
  const { easing } = tokens.motion[name]
  if (easing.type !== 'spring') return { reduceMotion: ReduceMotion.Never }
  const stiffness = ((2 * Math.PI) / easing.response) ** 2
  const damping = (4 * Math.PI * easing.dampingRatio) / easing.response
  return { mass: 1, stiffness, damping, reduceMotion: ReduceMotion.Never }
}

/**
 * Anime `value` vers `target` avec le token `name`. Sous mouvement réduit, la valeur saute à sa cible.
 * `onComplete` est **toujours** appelé (kit mobile § 2.6), sur le thread JS.
 */
export function animateTo(value: SharedValue<number>, target: number, name: MotionName, reduced: boolean, onComplete?: () => void) {
  if (reduced) {
    cancelAnimation(value)
    value.value = target
    onComplete?.()
    return
  }
  const done = (finished?: boolean) => {
    'worklet'
    if (finished && onComplete) scheduleOnRN(onComplete)
  }
  value.value = tokens.motion[name].easing.type === 'spring' ? withSpring(target, spring(name), done) : withTiming(target, timing(name), done)
}

/** Boucle infinie (spinner, cadres Elo, squelette) : rien sous mouvement réduit. */
export function loop(value: SharedValue<number>, to: number, duration: number, reduced: boolean, reverse = false) {
  cancelAnimation(value)
  value.value = 0
  if (reduced) return
  value.value = withRepeat(withTiming(to, { duration, easing: Easing.linear, reduceMotion: ReduceMotion.Never }), -1, reverse)
}
