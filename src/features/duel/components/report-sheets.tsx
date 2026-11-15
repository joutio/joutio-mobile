import { useMutation } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { Button, Field, ListGroup, ListRow, MobileSheet, Text, toast, tokens } from '@/design-system'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { QuestionReportReason, UserReportReason } from '@joutio/client/api-types'
import { currentLanguage, t, useT } from '@/lib/i18n'

const MAX_COMMENT = 500

const PLAYER_REASONS = (): { value: UserReportReason; label: string; sub: string }[] => ([
  { value: 'HARASSMENT', label: t('report.player.HARASSMENT'), sub: t('report.player.HARASSMENT.sub') },
  { value: 'HATE_SPEECH', label: t('report.player.HATE_SPEECH'), sub: t('report.player.HATE_SPEECH.sub') },
  { value: 'INAPPROPRIATE_CONTENT', label: t('report.player.INAPPROPRIATE_CONTENT'), sub: t('report.player.INAPPROPRIATE_CONTENT.sub') },
  { value: 'CHEATING', label: t('report.player.CHEATING'), sub: t('report.player.CHEATING.sub') },
  { value: 'SPAM', label: t('report.player.SPAM'), sub: t('report.player.SPAM.sub') },
  { value: 'OTHER', label: t('report.player.OTHER'), sub: t('report.player.OTHER.sub') },
])

const QUESTION_REASONS = (): { value: QuestionReportReason; label: string; sub: string }[] => ([
  { value: 'QUESTION', label: t('report.question.QUESTION'), sub: t('report.question.QUESTION.sub') },
  { value: 'IMAGE', label: t('report.question.IMAGE'), sub: t('report.question.IMAGE.sub') },
  { value: 'ANSWERS', label: t('report.question.ANSWERS'), sub: t('report.question.ANSWERS.sub') },
])

function Reasons<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { value: T; label: string; sub: string }[]
  value: readonly T[]
  onChange: (next: T[]) => void
}) {
  return (
    <ListGroup>
      {items.map((item, index) => (
        <ListRow
          key={item.value}
          label={item.label}
          sub={item.sub}
          control="check"
          on={value.includes(item.value)}
          onToggle={(on) => onChange(on ? [...value, item.value] : value.filter((reason) => reason !== item.value))}
          last={index === items.length - 1}
        />
      ))}
    </ListGroup>
  )
}

/** Remet le formulaire à zéro à chaque ouverture. */
function useReset(open: boolean, reset: () => void) {
  useEffect(() => {
    if (open) reset()
    // Seule l'ouverture compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
}

/**
 * Signaler un joueur depuis le résultat d'un duel (`POST /api/profiles/{id}/reports`, motifs `UserReportReason`, le duel
 * en contexte). Bloquer n'existe pas encore côté BFF (V1.1) : depuis la fiche joueur, l'offre de blocage passe par le mock
 * `features/social/lib/block-mocks.ts` ; ailleurs, seulement « Fermer ».
 */
export function ReportPlayerSheet({
  open,
  onClose,
  userId,
  name,
  gameId,
  subtitle,
  onBlock,
}: {
  open: boolean
  onClose: () => void
  userId: string
  name: string
  /** Duel de contexte, absent depuis une fiche joueur. */
  gameId?: string
  subtitle?: string
  /** Proposé après l'envoi (fiche joueur) : ferme la feuille puis ouvre la confirmation de blocage. */
  onBlock?: () => void
}) {
  const t = useT()
  const [reasons, setReasons] = useState<UserReportReason[]>([])
  // « Bloquer » : la confirmation (un `Modal`) s'ouvre une fois la feuille retirée, pas pendant sa fermeture.
  const blockAfterClose = useRef(false)
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  useReset(open, () => {
    setReasons([])
    setComment('')
    setSent(false)
  })
  const report = useMutation({
    mutationFn: () =>
      api.post<unknown>(ENDPOINTS.reports.player(userId), {
        reasons,
        comment: comment.trim() || undefined,
        gameId: gameId || undefined,
      }),
    onSuccess: () => setSent(true),
    onError: () => toast.error(t('report.error'), { description: t('home.errorText') }),
  })
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      onDismissed={() => {
        if (!blockAfterClose.current) return
        blockAfterClose.current = false
        onBlock?.()
      }}
      title={sent ? t('report.sent') : t('report.playerTitle', { name })}
      subtitle={sent ? undefined : subtitle}
      footer={
        sent ? (
          onBlock ? (
            <View style={{ gap: tokens.space[3] }}>
              <Button
                full
                variant="tinted"
                tone="destructive"
                onPress={() => {
                  blockAfterClose.current = true
                  onClose()
                }}
              >
                {t('mobile.report.block', { name })}
              </Button>
              <Button full variant="plain" tone="neutral" onPress={onClose}>
                {t('play.close')}
              </Button>
            </View>
          ) : (
            <Button full variant="gray" tone="neutral" onPress={onClose}>
              {t('play.close')}
            </Button>
          )
        ) : (
          <Button full disabled={reasons.length === 0} loading={report.isPending} onPress={() => report.mutate()}>
            {t('report.send')}
          </Button>
        )
      }
    >
      {sent ? (
        <Text variant="callout" color="muted" align="center">
          {onBlock ? t('mobile.report.thanksBlock') : t('report.playerThanks')}
        </Text>
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <Reasons items={PLAYER_REASONS()} value={reasons} onChange={setReasons} />
          <Field
            label={t('report.details')}
            placeholder={t('report.playerPlaceholder')}
            multiline
            value={comment}
            maxLength={MAX_COMMENT}
            counter={t('mobile.authoring.counter', { count: comment.length, max: MAX_COMMENT })}
            onChangeText={setComment}
          />
          <Text variant="caption" color="muted" align="center">
            {t('report.playerAnonymous', { name })}
          </Text>
        </View>
      )}
    </MobileSheet>
  )
}

/**
 * Signaler la question d'une manche (`POST /api/questions/{id}/reports`), empilé sur Détails du duel. Plusieurs motifs ;
 * « L'image » seulement si la question en a une.
 */
export function ReportQuestionSheet({
  open,
  onClose,
  questionId,
  gameId,
  hasImage,
  subtitle,
  onSent,
}: {
  open: boolean
  onClose: () => void
  questionId: string | null
  gameId: string
  hasImage: boolean
  subtitle: string
  onSent: () => void
}) {
  const t = useT()
  const [reasons, setReasons] = useState<QuestionReportReason[]>([])
  const [comment, setComment] = useState('')
  const [sent, setSent] = useState(false)
  useReset(open, () => {
    setReasons([])
    setComment('')
    setSent(false)
  })
  const report = useMutation({
    mutationFn: () =>
      api.post<unknown>(ENDPOINTS.reports.question(questionId ?? ''), { gameId, reasons, comment: comment.trim() || undefined, language: currentLanguage() }),
    onSuccess: () => {
      setSent(true)
      onSent()
    },
    onError: () => toast.error(t('report.error'), { description: t('home.errorText') }),
  })
  const items = QUESTION_REASONS().filter((item) => hasImage || item.value !== 'IMAGE')
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={sent ? t('report.sent') : t('result.reportQuestion')}
      subtitle={sent ? undefined : subtitle}
      footer={
        sent ? (
          <Button full variant="gray" tone="neutral" onPress={onClose}>
            {t('play.close')}
          </Button>
        ) : (
          <Button full disabled={reasons.length === 0 || !questionId} loading={report.isPending} onPress={() => report.mutate()}>
            {t('report.send')}
          </Button>
        )
      }
    >
      {sent ? (
        <Text variant="callout" color="muted" align="center">
          {t('report.questionThanks')}
        </Text>
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <Text variant="callout" color="muted" align="center">
            {t('report.questionIntro')}
          </Text>
          <Reasons items={items} value={reasons} onChange={setReasons} />
          <Field
            label={t('report.details')}
            placeholder={t('mobile.common.optional')}
            multiline
            value={comment}
            maxLength={MAX_COMMENT}
            counter={t('mobile.authoring.counter', { count: comment.length, max: MAX_COMMENT })}
            onChangeText={setComment}
          />
        </View>
      )}
    </MobileSheet>
  )
}
