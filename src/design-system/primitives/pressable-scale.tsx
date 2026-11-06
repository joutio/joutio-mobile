import { useState, type ReactNode, type Ref } from 'react'
import { Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated'
import { haptic as playHaptic, type HapticName } from '../haptics'
import type { ViewRef } from '../a11y'
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
  /** Cible du focus du lecteur d'écran (menu, feuille). */
  ref?: Ref<ViewRef>
  style?: StyleProp<ViewStyle> | ((state: { pressed: boolean }) => StyleProp<ViewStyle>)
  children?: ReactNode | ((state: { pressed: boolean }) => ReactNode)
}

/** Propriétés de mise en page du contenu : elles passent sur le `Pressable` intérieur quand une enveloppe découpe le ripple. */
const INNER_KEYS = [
  'padding',
  'paddingHorizontal',
  'paddingVertical',
  'paddingTop',
  'paddingBottom',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingEnd',
  'flexDirection',
  'flexWrap',
  'alignItems',
  'alignContent',
  'justifyContent',
  'gap',
  'rowGap',
  'columnGap',
] as const satisfies readonly (keyof ViewStyle)[]

const RADIUS_KEYS = [
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderTopStartRadius',
  'borderTopEndRadius',
  'borderBottomStartRadius',
  'borderBottomEndRadius',
] as const satisfies readonly (keyof ViewStyle)[]

/** Sépare le style : la carte (taille, fond, coins, marges) dehors, le contenu (marges internes, flex) dedans. */
function splitForClip(style: ViewStyle): { outer: ViewStyle; inner: ViewStyle } {
  const outer: Record<string, unknown> = { ...style }
  const inner: Record<string, unknown> = {}
  for (const key of INNER_KEYS) {
    if (key in outer) {
      inner[key] = outer[key]
      delete outer[key]
    }
  }
  return { outer: outer as ViewStyle, inner: inner as ViewStyle }
}

/** `jo-pressed` du lab : Pressable + échelle Reanimated au token `micro`, rien sous mouvement réduit. */
export function PressableScale({
  pressedScale = 0.98,
  haptic,
  forcePressed = false,
  ripple = false,
  ref,
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
  const ripplePress = nativeRipple ? { color: alpha(colors.text, 0.12) } : props.android_ripple
  const handlers = {
    onPressIn: (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      setPressed(true)
      // Enfoncement immédiat, relâchement en ressort : la sensation des contrôles système.
      if (pressedScale !== 1 && !reduced)
        scale.value = withTiming(pressedScale, { duration: 90, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.Never })
      onPressIn?.(event)
    },
    onPressOut: (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      setPressed(false)
      if (pressedScale !== 1 && !reduced) scale.value = withSpring(1, { mass: 1, stiffness: 520, damping: 26, reduceMotion: ReduceMotion.Never })
      onPressOut?.(event)
    },
    onPress: (event: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
      if (haptic) playHaptic(haptic)
      onPress?.(event)
    },
  }
  const scaleStyle = forcePressed && pressedScale !== 1 ? { transform: [{ scale: pressedScale }] } : animated

  // Android : le masque du ripple est rectangulaire et `overflow: hidden` ne découpe que les enfants d'une vue, pas
  // son propre fond. Une carte arrondie qui porte le ripple passe donc par une enveloppe qui découpe ses coins.
  const flat = nativeRipple ? (StyleSheet.flatten(resolvedStyle) ?? {}) : undefined
  if (flat && RADIUS_KEYS.some((key) => flat[key] !== undefined && flat[key] !== 0)) {
    const { outer, inner } = splitForClip(flat)
    return (
      <Animated.View style={[outer, { overflow: 'hidden' }, scaleStyle]}>
        <Pressable
          ref={ref}
          {...props}
          {...handlers}
          disabled={disabled}
          android_ripple={ripplePress}
          accessibilityState={{ disabled: Boolean(disabled), ...props.accessibilityState }}
          style={[inner, { flexGrow: 1 }]}
        >
          {typeof children === 'function' ? children({ pressed }) : children}
        </Pressable>
      </Animated.View>
    )
  }

  return (
    <AnimatedPressable
      ref={ref}
      {...props}
      disabled={disabled}
      android_ripple={ripplePress}
      accessibilityState={{ disabled: Boolean(disabled), ...props.accessibilityState }}
      {...handlers}
      style={[resolvedStyle, scaleStyle]}
    >
      {typeof children === 'function' ? children({ pressed }) : children}
    </AnimatedPressable>
  )
}
