import { useEffect } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'

export type TimerState = 'running' | 'low' | 'frozen' | 'expired'

/** Rouge du décompte, commun à `TimerBar` et `DuelHeader`. */
export const isTimerUrgent = (seconds: number, state: TimerState = 'running', lowAt = 3) =>
  state === 'low' || state === 'expired' || (state === 'running' && seconds > 0 && seconds <= lowAt)

export interface TimerBarProps {
  /** Secondes restantes (décimales acceptées), calculées par l'appelant. */
  seconds: number
  /** Durée totale d'une manche. */
  total?: number
  /** Temps restant au moment où le premier joueur a répondu. */
  first?: number
  state?: TimerState
  lowAt?: number
  /** Échéance (ms epoch serveur) et horloge : la barre descend seule, à 60 ips, jusqu'à 0. */
  deadline?: { at: number; now: () => number }
  style?: StyleProp<ViewStyle>
}

/**
 * Chrono de la manche, en barre pleine largeur. Avec `deadline` et l'état `running`, la largeur s'anime d'elle-même
 * jusqu'à l'échéance serveur (pas de mise à jour à chaque seconde) ; figée, elle garde le temps restant.
 */
export function TimerBar({ seconds, total = 10, first, state = 'running', lowAt = 3, deadline, style }: TimerBarProps) {
  const { colors } = useTheme()
  const fraction = state === 'expired' ? 0 : Math.max(0, Math.min(1, seconds / total))
  const width = useSharedValue(fraction)

  useEffect(() => {
    if (state === 'running' && deadline) {
      const remaining = Math.max(0, deadline.at - deadline.now())
      width.value = Math.max(0, Math.min(1, remaining / 1000 / total))
      width.value = withTiming(0, { duration: remaining, easing: Easing.linear, reduceMotion: ReduceMotion.Never })
    } else {
      width.value = fraction
    }
  }, [state, deadline?.at, fraction, total, width, deadline])

  // `scaleX` plutôt que `width` : animé sur le thread UI sans relayout (AGENTS.md, Reanimated).
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: width.value }] }))
  const urgent = isTimerUrgent(seconds, state, lowAt)
  const firstWidth = first === undefined ? 0 : Math.max(0, (first / total) * 100 - fraction * 100)
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Temps restant : ${Math.ceil(seconds)} s${first === undefined ? '' : `, premier à répondre à ${Math.ceil(first)} s`}`}
      accessibilityValue={{ min: 0, max: total, now: Math.ceil(seconds) }}
      style={[{ height: 8, alignSelf: 'stretch', overflow: 'hidden' }, style]}
    >
      {firstWidth > 0 && (
        <View
          style={{ position: 'absolute', top: 0, bottom: 0, left: `${fraction * 100}%`, width: `${firstWidth}%`, backgroundColor: alpha(colors.text, 0.45) }}
        />
      )}
      <Animated.View
        style={[
          { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, transformOrigin: 'left', backgroundColor: urgent ? colors.wrong : colors.text },
          fill,
        ]}
      />
    </View>
  )
}
