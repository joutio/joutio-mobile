import { useState, type ReactNode } from 'react'
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { haptic as playHaptic, type HapticName } from '../haptics'
import { useReducedMotion } from '../motion'
import { alpha } from '../theme/color'
import { useTheme } from '../theme/theme-provider'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/** Cible tactile minimale (kit mobile § 6). */
export const MIN_TARGET = 44

/** `hitSlop` qui porte une cible visible de `size` à 44 pt. */
export const slopFor = (height: number, width = MIN_TARGET) => {
  const vertical = Math.max(0, (MIN_TARGET - height) / 2)
  const horizontal = Math.max(0, (MIN_TARGET - width) / 2)
  return { top: vertical, bottom: vertical, left: horizontal, right: horizontal }
}

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  /** Échelle à la pression : `.98` (bouton), `.94` (icône, onglet), `1` sans échelle. */
  pressedScale?: number
  haptic?: HapticName
  /** Force l'état pressé (catalogue : `data-state="pressed"` du lab). */
  forcePressed?: boolean
  /** Ligne de liste : ripple Material sur Android, à la place du fond pressé. */
  ripple?: boolean
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>)
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode)
}

/** `jo-pressed` du lab : Pressable + échelle Reanimated au token `micro`, rien sous mouvement réduit. */
export function PressableScale({
  pressedScale = 0.98,
  haptic,
  forcePressed = false,
  ripple = false,
  style,
  children,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}: PressableScaleProps) {
  const reduced = useReducedMotion()
  const { colors } = useTheme()
  const scale = useSharedValue(1)
  const [pressedState, setPressed] = useState(false)
  // Avec le ripple Android, la ligne ne prend pas en plus le fond pressé.
  const nativeRipple = ripple && Platform.OS === 'android'
  const pressed = forcePressed || (pressedState && !nativeRipple)
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))

  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      android_ripple={nativeRipple ? { color: alpha(colors.text, 0.12) } : props.android_ripple}
      accessibilityState={{ disabled: Boolean(disabled), ...props.accessibilityState }}
      onPressIn={(event) => {
        setPressed(true)
        // Enfoncement immédiat, relâchement en ressort : la sensation des contrôles système.
        if (pressedScale !== 1 && !reduced)
          scale.value = withTiming(pressedScale, { duration: 90, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never })
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        setPressed(false)
        if (pressedScale !== 1 && !reduced) scale.value = withSpring(1, { mass: 1, stiffness: 520, damping: 26, reduceMotion: ReduceMotion.Never })
        onPressOut?.(event)
      }}
      onPress={(event) => {
        if (haptic) playHaptic(haptic)
        onPress?.(event)
      }}
      style={[resolvedStyle, forcePressed && pressedScale !== 1 ? { transform: [{ scale: pressedScale }] } : animated]}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  )
}
