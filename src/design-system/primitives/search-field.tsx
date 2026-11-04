import { useRef, useState } from 'react'
import { TextInput, View, type TextInputInstance, type StyleProp, type ViewStyle } from 'react-native'
import { MagnifyingGlassIcon, XCircleIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Button } from './button'
import { PressableScale } from './pressable-scale'
import { inputStyle, MAX_FONT_SCALE } from './text'

export interface SearchFieldProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Nom accessible. */
  label?: string
  /** Affiche « Annuler » pendant la saisie. */
  onCancel?: () => void
  onSubmit?: () => void
  /** Force l'état actif (catalogue). */
  active?: boolean
  autoFocus?: boolean
  style?: StyleProp<ViewStyle>
}

/** Recherche en pilule, 44 pt. Dans un écran, collée sous la barre de titre (`StickyBar`). */
export function SearchField({
  value,
  onChange,
  placeholder = 'Rechercher',
  label = 'Rechercher',
  onCancel,
  onSubmit,
  active = false,
  autoFocus,
  style,
}: SearchFieldProps) {
  const { colors, radius } = useTheme()
  const [focused, setFocused] = useState(false)
  const input = useRef<TextInputInstance>(null)
  const engaged = active || focused || value !== ''

  return (
    <View style={[{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }, style]}>
      <View
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[3],
          paddingHorizontal: tokens.space[5],
          borderRadius: radius.full,
          backgroundColor: colors.raised,
          boxShadow: active || focused ? `inset 0 0 0 2px ${colors.accent}` : undefined,
        }}
      >
        <MagnifyingGlassIcon size={20} color={colors.muted} />
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          accessibilityRole="search"
          returnKeyType="search"
          autoCorrect={false}
          autoFocus={autoFocus}
          onSubmitEditing={onSubmit}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[inputStyle('body'), { flex: 1, minWidth: 0, paddingHorizontal: 0, color: colors.text }]}
        />
        {value !== '' && (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Effacer la recherche"
            pressedScale={1}
            hitSlop={13}
            onPress={() => {
              onChange('')
              input.current?.focus()
            }}
          >
            <XCircleIcon size={18} weight="fill" color={colors.muted} />
          </PressableScale>
        )}
      </View>
      {onCancel && engaged && (
        <Button
          variant="plain"
          size="S"
          style={{ alignSelf: 'center' }}
          onPress={() => {
            input.current?.blur()
            onCancel()
          }}
        >
          Annuler
        </Button>
      )}
    </View>
  )
}
