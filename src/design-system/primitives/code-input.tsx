import { useEffect, useRef, useState } from 'react'
import { Pressable, TextInput, View, type StyleProp, type TextInputInstance, type ViewStyle } from 'react-native'
import Animated, { cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'
import { useReducedMotion } from '../motion'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: boolean
  /** Nom accessible. */
  label?: string
  /** Force le focus (catalogue). */
  focused?: boolean
  /** Focus à l'ouverture de l'écran. */
  autoFocus?: boolean
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}

function Caret({ color }: { color: string }) {
  const reduced = useReducedMotion()
  const opacity = useSharedValue(1)
  useEffect(() => {
    cancelAnimation(opacity)
    opacity.value = 1
    if (reduced) return
    opacity.value = withRepeat(withTiming(0, { duration: 500, easing: Easing.steps(2), reduceMotion: ReduceMotion.Never }), -1, true)
  }, [reduced, opacity])
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }))
  return <Animated.View style={[{ width: 2, height: 24, backgroundColor: color }, animated]} />
}

/**
 * Code à usage unique : **un seul champ réel** (invisible) sous les cases, pour garder le collage,
 * l'autoremplissage (`oneTimeCode`, `sms-otp`) et le clavier numérique.
 */
export function CodeInput({
  value,
  onChange,
  length = 6,
  error = false,
  label = 'Code reçu par e-mail',
  focused = false,
  autoFocus = false,
  disabled = false,
  style,
}: CodeInputProps) {
  const { colors, radius } = useTheme()
  const input = useRef<TextInputInstance>(null)
  const [hasFocus, setHasFocus] = useState(false)
  const showCaret = (focused || hasFocus) && !error

  return (
    <Pressable
      accessible={false}
      onPress={() => input.current?.focus()}
      style={[{ alignSelf: 'stretch', flexDirection: 'row', gap: tokens.space[3], opacity: disabled ? 0.4 : 1 }, style]}
    >
      {Array.from({ length }, (_, index) => {
        const current = showCaret && index === Math.min(value.length, length - 1)
        const ring = error ? colors.wrong : current ? colors.accent : undefined
        return (
          <View
            key={index}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={{
              flex: 1,
              height: 52,
              borderRadius: radius.sm,
              backgroundColor: colors.raised,
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: ring ? `inset 0 0 0 2px ${ring}` : undefined,
            }}
          >
            {value[index] !== undefined ? <Text variant="numeric">{value[index]}</Text> : current && <Caret color={colors.accent} />}
          </View>
        )
      })}
      <TextInput
        ref={input}
        autoFocus={autoFocus}
        editable={!disabled}
        accessibilityLabel={label}
        accessibilityValue={{ text: value.split('').join(' ') }}
        accessibilityState={{ disabled }}
        accessibilityHint={error ? 'Code incorrect' : `${length} chiffres`}
        keyboardType="number-pad"
        inputMode="numeric"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        value={value}
        caretHidden
        contextMenuHidden={false}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        onFocus={() => setHasFocus(true)}
        onBlur={() => setHasFocus(false)}
        style={{ position: 'absolute', inset: 0, opacity: 0.011, color: 'transparent' }}
      />
    </Pressable>
  )
}
