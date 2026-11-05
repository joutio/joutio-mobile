import { useEffect } from 'react'
import { Easing, ReduceMotion, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import { tokens } from './tokens.generated'

/** Étape d'une keyframe : `[position de 0 à 1 dans la séquence, valeur]`. */
export type Stop = readonly [number, number]

const [x1, y1, x2, y2] = tokens.motion.base.easing.type === 'bezier' ? tokens.motion.base.easing.points : [0.32, 0.72, 0, 1]
const BASE = Easing.bezierFn(x1, y1, x2, y2)

/**
 * Valeur d'une keyframe CSS (`@keyframes` du lab) à la position `t` : interpolation entre les deux étapes qui
 * l'encadrent, avec l'easing `base` sur chaque segment, comme `animation-timing-function` en CSS.
 */
export function keyframe(t: number, stops: readonly Stop[]): number {
  'worklet'
  const first = stops[0]
  if (!first) return 0
  if (t <= first[0]) return first[1]
  for (let index = 1; index < stops.length; index += 1) {
    const to = stops[index]
    const from = stops[index - 1]
    if (!to || !from) break
    if (t <= to[0]) {
      const span = to[0] - from[0]
      const local = span <= 0 ? 1 : (t - from[0]) / span
      return from[1] + (to[1] - from[1]) * BASE(local)
    }
  }
  return stops[stops.length - 1]?.[1] ?? 0
}

/**
 * Progression linéaire de 0 à 1 d'une séquence de `duration` ms, démarrée à `elapsedMs` (le serveur peut être déjà
 * avancé : on reprend la séquence là où elle en est, jamais du début). Sous mouvement réduit ou sans `animated`, elle
 * reste sur `held` (l'état tenu). `onComplete` est **toujours** appelé à la fin, mouvement réduit compris.
 */
export function useTimeline({
  duration,
  elapsedMs = 0,
  animated,
  held,
  onComplete,
}: {
  duration: number
  elapsedMs?: number
  animated: boolean
  /** Position affichée sans animation. */
  held: number
  onComplete?: () => void
}): SharedValue<number> {
  const start = Math.min(1, Math.max(0, elapsedMs / duration))
  const progress = useSharedValue(animated ? start : held)

  useEffect(() => {
    const remaining = Math.max(0, duration - elapsedMs)
    if (!animated) {
      progress.value = held
      if (!onComplete) return
      const timer = setTimeout(onComplete, remaining)
      return () => clearTimeout(timer)
    }
    progress.value = start
    progress.value = withTiming(1, { duration: remaining, easing: Easing.linear, reduceMotion: ReduceMotion.Never }, (finished) => {
      if (finished && onComplete) scheduleOnRN(onComplete)
    })
    return undefined
    // Une séquence par montage : l'écran remonte le composant pour en rejouer une.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return progress
}
