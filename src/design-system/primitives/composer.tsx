import { ScrollView, TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { PaperPlaneTiltIcon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Chip } from './chip'
import { IconButton } from './icon-button'
import { inputStyle, MAX_FONT_SCALE } from './text'

export interface ComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: (value: string) => void
  placeholder?: string
  /** Réponses rapides. */
  suggestions?: readonly string[]
  /** Par défaut, une suggestion remplit le champ. */
  onSuggestion?: (suggestion: string) => void
  autoFocus?: boolean
  style?: StyleProp<ViewStyle>
}

/** Saisie d'un message : champ en pilule et envoi, réponses rapides au-dessus. */
export function Composer({ value, onChange, onSend, placeholder = 'Message', suggestions = [], onSuggestion, autoFocus, style }: ComposerProps) {
  const { colors, radius } = useTheme()
  const empty = value.trim() === ''
  const send = () => {
    if (!empty) onSend(value)
  }

  return (
    <View style={[{ alignSelf: 'stretch', gap: tokens.space[3] }, style]}>
      {suggestions.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollsToTop={false} contentContainerStyle={{ gap: tokens.space[3] }}>
          {suggestions.map((suggestion) => (
            <Chip key={suggestion} variant="suggestion" onPress={() => (onSuggestion ?? onChange)(suggestion)}>
              {suggestion}
            </Chip>
          ))}
        </ScrollView>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}>
        <TextInput
          accessibilityLabel={placeholder}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          selectionColor={colors.accent}
          cursorColor={colors.accent}
          returnKeyType="send"
          submitBehavior="submit"
          onSubmitEditing={send}
          autoFocus={autoFocus}
          maxFontSizeMultiplier={MAX_FONT_SCALE}
          style={[
            inputStyle('body'),
            {
              flex: 1,
              minWidth: 0,
              height: 44,
              paddingHorizontal: tokens.space[5],
              borderRadius: radius.full,
              backgroundColor: colors.raised,
              color: colors.text,
            },
          ]}
        />
        <IconButton icon={PaperPlaneTiltIcon} label="Envoyer" variant="filled" tone="accent" disabled={empty} onPress={send} />
      </View>
    </View>
  )
}
