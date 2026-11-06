import { TextInput, View, type StyleProp, type ViewStyle } from 'react-native'
import { CheckIcon } from '../icons'
import { tint } from '../theme/color'
import { fontFace } from '../theme/fonts'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { inputStyle, MAX_FONT_SCALE, Text } from './text'

export interface AnswerEditorRowProps {
  value: string
  onChange?: (value: string) => void
  /** Bonne réponse. */
  correct?: boolean
  onMarkCorrect?: () => void
  /** Numéro de la réponse, pour les libellés. */
  index: number
  maxLength?: number
  /** Indication du champ vide, `Réponse N` par défaut : par exemple la réponse française à traduire. */
  placeholder?: string
  last?: boolean
  style?: StyleProp<ViewStyle>
}

/** Saisie d'une réponse, puis bouton « Juste », dans un `RadioGroup`. Le mot double la couleur. */
export function AnswerEditorRow({
  value,
  onChange,
  correct = false,
  onMarkCorrect,
  index,
  maxLength = 60,
  placeholder,
  last = false,
  style,
}: AnswerEditorRowProps) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        {
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[2],
          paddingLeft: tokens.space[4],
          paddingRight: tokens.space[1],
          backgroundColor: correct ? tint(colors.correct) : undefined,
          borderBottomWidth: last ? 0 : HAIRLINE,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <TextInput
        value={value}
        maxLength={maxLength}
        accessibilityLabel={`Réponse ${index}`}
        placeholder={placeholder ?? `Réponse ${index}`}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        onChangeText={onChange}
        style={[
          inputStyle('body'),
          { flex: 1, minWidth: 0, paddingVertical: tokens.space[3], color: colors.text },
          correct && { fontFamily: fontFace('Geist', '600') },
        ]}
      />
      <PressableScale
        accessibilityRole="radio"
        accessibilityState={{ checked: correct }}
        accessibilityLabel={`Réponse ${index} : bonne réponse`}
        onPress={onMarkCorrect}
        style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: tokens.space[2] }}
      >
        <View
          style={{
            height: 28,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[1],
            borderRadius: radius.full,
            paddingHorizontal: tokens.space[3],
            backgroundColor: correct ? colors.correct : undefined,
            borderWidth: correct ? 0 : 1,
            borderColor: colors.border,
          }}
        >
          {correct && <CheckIcon size={14} weight="bold" color={colors.onCorrect} />}
          <Text variant="caption" weight="600" color={correct ? 'onCorrect' : 'muted'}>
            Juste
          </Text>
        </View>
      </PressableScale>
    </View>
  )
}
