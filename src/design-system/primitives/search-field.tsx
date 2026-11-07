import { useRef, useState, type RefObject } from 'react'
import { TextInput, type TextInputInstance, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { Easing, FadeInRight, FadeOutRight, LinearTransition } from 'react-native-reanimated'
import { useReducedMotion } from '../motion'
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
  onFocus?: () => void
  onBlur?: () => void
  inputRef?: RefObject<TextInputInstance | null>
  /** Contrôle l’annulation indépendamment du texte et du clavier (en-tête de liste). */
  cancelVisible?: boolean
  /** Force l'état actif (catalogue). */
  active?: boolean
  autoFocus?: boolean
  style?: StyleProp<ViewStyle>
}

/** Comme la barre de recherche iOS : le champ se rétracte pendant qu'« Annuler » glisse depuis la droite. */
const DURATION = 250
const EASING = Easing.bezier(0.32, 0.72, 0, 1)
const RESIZE = LinearTransition.duration(DURATION).easing(EASING)
const CANCEL_IN = FadeInRight.duration(DURATION).easing(EASING)
const CANCEL_OUT = FadeOutRight.duration(200).easing(EASING)

/**
 * Recherche en pilule, 44 pt. Dans un écran, collée sous la barre de titre (`StickyBar`). « Annuler » apparaît et
 * disparaît en glissant, le champ suit en douceur ; rien ne bouge sous mouvement réduit (réglage système).
 */
export function SearchField({
  value,
  onChange,
  placeholder = 'Rechercher',
  label = 'Rechercher',
  onCancel,
  onSubmit,
  onFocus,
  onBlur,
  inputRef,
  cancelVisible,
  active = false,
  autoFocus,
  style,
}: SearchFieldProps) {
  const { colors, radius } = useTheme()
  const [focused, setFocused] = useState(false)
  const localInput = useRef<TextInputInstance>(null)
  const input = inputRef ?? localInput
  const reduced = useReducedMotion()
  const engaged = active || focused || value !== ''

  return (
    <Animated.View
      layout={reduced ? undefined : RESIZE}
      style={[{ alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }, style]}
    >
      <Animated.View
        layout={reduced ? undefined : RESIZE}
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
          onFocus={() => {
            setFocused(true)
            onFocus?.()
          }}
          onBlur={() => {
            setFocused(false)
            onBlur?.()
          }}
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
      </Animated.View>
      {onCancel && (cancelVisible ?? engaged) && (
        <Animated.View entering={reduced ? undefined : CANCEL_IN} exiting={reduced ? undefined : CANCEL_OUT} style={{ alignSelf: 'center' }}>
          <Button
            variant="plain"
            size="S"
            onPress={() => {
              input.current?.blur()
              onCancel()
            }}
          >
            Annuler
          </Button>
        </Animated.View>
      )}
    </Animated.View>
  )
}
