import { TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native'
import { CheckIcon } from '../icons'
import { tint } from '../theme/color'
import { fontFace } from '../theme/fonts'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { inputStyle, MAX_FONT_SCALE, Text } from './text'
import { useT } from '@/lib/i18n'

export interface AnswerEditorRowProps extends Pick<TextInputProps, 'returnKeyType' | 'submitBehavior' | 'onSubmitEditing'> {
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
  returnKeyType,
  submitBehavior,
  onSubmitEditing,
}: AnswerEditorRowProps) {
  const t = useT()
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
        accessibilityLabel={t('mobile.ds.answerN', { index })}
        placeholder={placeholder ?? t('mobile.ds.answerN', { index })}
        placeholderTextColor={colors.muted}
        selectionColor={colors.accent}
        cursorColor={colors.accent}
        maxFontSizeMultiplier={MAX_FONT_SCALE}
        onChangeText={onChange}
        returnKeyType={returnKeyType}
        submitBehavior={submitBehavior}
        onSubmitEditing={onSubmitEditing}
        style={[
          inputStyle('body'),
          { flex: 1, minWidth: 0, paddingVertical: tokens.space[3], color: colors.text },
          correct && { fontFamily: fontFace('Geist', '600') },
        ]}
      />
      <PressableScale
        accessibilityRole="radio"
        accessibilityState={{ checked: correct }}
        accessibilityLabel={t('mobile.ds.answerCorrect', { index })}
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
            {t('mobile.ds.correct')}
          </Text>
        </View>
      </PressableScale>
    </View>
  )
}
