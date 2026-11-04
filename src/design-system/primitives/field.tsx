import { useEffect, useId, useRef, useState } from 'react'
import { AccessibilityInfo, Platform, TextInput, View, type TextInputInstance, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { WarningCircleIcon, XCircleIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { inputStyle, MAX_FONT_SCALE, Text } from './text'
import { hairlineRing } from '../theme/hairline'

export interface FieldProps extends Omit<TextInputProps, 'style' | 'editable'> {
  label?: string
  hint?: string
  error?: string
  /** Texte libre à droite du libellé, par exemple `12/80`. */
  counter?: string
  /** Zone de texte de 96 pt. */
  multiline?: boolean
  /** Affiche le bouton d'effacement quand le champ a une valeur. */
  onClear?: () => void
  disabled?: boolean
  /** Force le focus (catalogue). */
  forceFocus?: boolean
  style?: StyleProp<ViewStyle>
}

/** Annonce un message d'erreur dès qu'il apparaît (`role="alert"` du lab). */
export function useAnnounce(message: string | undefined) {
  useEffect(() => {
    if (message && Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message)
  }, [message])
}

export function Field({
  label,
  hint,
  error,
  counter,
  multiline = false,
  onClear,
  disabled = false,
  forceFocus = false,
  value,
  style,
  onFocus,
  onBlur,
  ...props
}: FieldProps) {
  const { colors, radius } = useTheme()
  const input = useRef<TextInputInstance>(null)
  const [focused, setFocused] = useState(false)
  const nativeId = useId()
  useAnnounce(error)

  const ring = error ? `inset 0 0 0 2px ${colors.wrong}` : focused || forceFocus ? `inset 0 0 0 2px ${colors.accent}` : hairlineRing(colors.border)
  const message = error ?? hint

  return (
    <View style={[{ alignSelf: 'stretch', gap: tokens.space[3], opacity: disabled ? 0.4 : 1 }, style]}>
      {(label || counter) && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: tokens.space[3] }}>
          <Text variant="callout" nativeID={`${nativeId}-label`}>
            {label}
          </Text>
          {counter && (
            <Text variant="caption" mono color={error ? 'wrong' : 'muted'}>
              {counter}
            </Text>
          )}
        </View>
      )}
      <View
        style={{
          minHeight: multiline ? 96 : 48,
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: tokens.space[3],
          paddingVertical: tokens.space[4],
          paddingLeft: 14,
          paddingRight: tokens.space[3],
          borderRadius: radius.sm,
          backgroundColor: colors.raised,
          boxShadow: ring,
        }}
      >
        <TextInput
          {...props}
          ref={input}
          value={value}
          editable={!disabled}
          multiline={multiline}
          accessibilityLabel={label}
          accessibilityLabelledBy={label ? `${nativeId}-label` : undefined}
          accessibilityHint={message}
          accessibilityState={{ disabled }}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          onFocus={(event) => {
            setFocused(true)
            onFocus?.(event)
          }}
          onBlur={(event) => {
            setFocused(false)
            onBlur?.(event)
          }}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[inputStyle('body', multiline), { flex: 1, minWidth: 0, paddingHorizontal: 0, color: colors.text }, multiline && { minHeight: 72 }]}
        />
        {onClear && value !== undefined && value !== '' && !multiline && !disabled && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={label ? `Effacer ${label}` : 'Effacer'}
            pressedScale={1}
            hitSlop={12}
            onPress={() => {
              onClear()
              input.current?.focus()
            }}
          >
            <XCircleIcon size={20} weight="fill" color={colors.muted} />
          </PressableScale>
        )}
      </View>
      {error ? (
        <View accessibilityLiveRegion="assertive" style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
          <WarningCircleIcon size={16} weight="fill" color={colors.wrong} />
          <Text variant="caption" color="wrong">
            {error}
          </Text>
        </View>
      ) : (
        hint && (
          <Text variant="caption" color="muted">
            {hint}
          </Text>
        )
      )}
    </View>
  )
}
