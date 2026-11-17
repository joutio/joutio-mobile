import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CheckCircleIcon } from '../icons'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Button } from './button'
import { Text } from './text'
import { useT } from '@/lib/i18n'

export interface ModerationCardProps {
  /** Auteur, rôle et date. */
  author: string
  question: string
  answers: readonly string[]
  /** Index de la bonne réponse. */
  correct: number
  /** Approbation ou rejet en cours : les boutons attendent. */
  busy?: 'approve' | 'reject'
  onApprove?: () => void
  onReject?: () => void
  onEdit?: () => void
  style?: StyleProp<ViewStyle>
}

/** Question à valider : auteur, énoncé, réponses (la bonne cochée et annoncée), Rejeter, Approuver, Modifier. */
export function ModerationCard({ author, question, answers, correct, busy, onApprove, onReject, onEdit, style }: ModerationCardProps) {
  const t = useT()
  const { colors, radius } = useTheme()
  return (
    <View style={[{ gap: tokens.space[3], borderRadius: radius.lg, backgroundColor: colors.surface, padding: tokens.space[4] }, style]}>
      <Text variant="caption" color="muted">
        {author}
      </Text>
      <Text variant="headline">{question}</Text>
      <View style={{ overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.raised }}>
        {answers.map((answer, index) => (
          <View
            key={`${index}-${answer}`}
            accessible
            accessibilityLabel={index === correct ? t('ds.answerIsCorrect', { answer }) : answer}
            style={{
              minHeight: 50,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: tokens.space[3],
              paddingHorizontal: tokens.space[4],
              paddingVertical: tokens.space[2],
              borderBottomWidth: index < answers.length - 1 ? HAIRLINE : 0,
              borderBottomColor: colors.border,
            }}
          >
            <Text variant="body" weight={index === correct ? '600' : undefined} style={{ flexShrink: 1 }}>
              {answer}
            </Text>
            {index === correct && <CheckCircleIcon size={20} weight="fill" color={colors.correct} />}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
        <View style={{ flex: 1 }}>
          <Button variant="tinted" tone="destructive" size="M" full loading={busy === 'reject'} disabled={busy !== undefined} onPress={onReject}>
            {t('workshop.reject')}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button size="M" full loading={busy === 'approve'} disabled={busy !== undefined} onPress={onApprove}>
            {t('ds.approve')}
          </Button>
        </View>
      </View>
      <Button variant="plain" tone="neutral" size="M" full disabled={busy !== undefined} onPress={onEdit}>
        {t('ds.editBeforeApprove')}
      </Button>
    </View>
  )
}
