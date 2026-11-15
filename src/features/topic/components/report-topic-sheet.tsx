import {
  CONTENT_NOTICE_CATEGORIES,
  CONTENT_NOTICE_MIN_DESCRIPTION,
  CONTENT_NOTICES_ENDPOINT,
  type ContentNoticeCategory,
  type ContentNoticeRequest,
} from '@joutio/client/api-types'
import { buildShareUrl } from '@joutio/client/share'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Button, Field, ListGroup, ListRow, MobileSheet, Text, toast, tokens } from '@/design-system'
import { useMe } from '@/features/me'
import { api } from '@/lib/api'
import { useT, type MessageKey } from '@/lib/i18n'

const MAX_DESCRIPTION = 4000

/**
 * Signaler un sujet depuis sa fiche (2026-11-15) : notification de contenu illicite (LCEN/DSA), traitée par la
 * modération dans la console. Lien du sujet, pseudonyme et e-mail du joueur sont remplis d'office ; le formulaire
 * repart à zéro à chaque ouverture.
 */
export function ReportTopicSheet({ open, onClose, topicId, name }: { open: boolean; onClose: () => void; topicId: string; name: string }) {
  const t = useT()
  const me = useMe()
  const [category, setCategory] = useState<ContentNoticeCategory>()
  const [description, setDescription] = useState('')
  const [goodFaith, setGoodFaith] = useState(false)
  const [sent, setSent] = useState(false)
  useEffect(() => {
    if (!open) return
    setCategory(undefined)
    setDescription('')
    setGoodFaith(false)
    setSent(false)
  }, [open])
  const report = useMutation({
    mutationFn: () =>
      api.post<unknown>(CONTENT_NOTICES_ENDPOINT, {
        name: me.data?.pseudonym ?? '',
        email: me.data?.email ?? '',
        quality: category === 'COPYRIGHT' || category === 'IMAGE_RIGHTS' ? 'RIGHTS_HOLDER' : 'THIRD_PARTY',
        contentUrl: buildShareUrl({ kind: 'topic', id: topicId }),
        category: category ?? 'OTHER_ILLEGAL',
        description: description.trim(),
        goodFaith,
      } satisfies ContentNoticeRequest),
    onSuccess: () => setSent(true),
    onError: () => toast.error(t('report.error'), { description: t('home.errorText') }),
  })
  const ready = category !== undefined && description.trim().length >= CONTENT_NOTICE_MIN_DESCRIPTION && goodFaith && Boolean(me.data?.email)
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={sent ? t('report.sent') : t('topicReport.title')}
      subtitle={sent ? undefined : name}
      footer={
        sent ? (
          <Button full variant="gray" tone="neutral" onPress={onClose}>
            {t('play.close')}
          </Button>
        ) : (
          <Button full disabled={!ready} loading={report.isPending} onPress={() => report.mutate()}>
            {t('report.send')}
          </Button>
        )
      }
    >
      {sent ? (
        <Text variant="callout" color="muted" align="center">
          {t('topicReport.thanks')}
        </Text>
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <ListGroup surface="raised">
            {CONTENT_NOTICE_CATEGORIES.map((item, index) => (
              <ListRow
                key={item}
                label={t(`topicReport.reason.${item}` as MessageKey)}
                sub={t(`topicReport.reason.${item}.sub` as MessageKey)}
                control="radio"
                on={category === item}
                onToggle={() => setCategory(item)}
                last={index === CONTENT_NOTICE_CATEGORIES.length - 1}
              />
            ))}
          </ListGroup>
          <Field
            label={t('topicReport.description')}
            placeholder={t('topicReport.placeholder')}
            multiline
            value={description}
            maxLength={MAX_DESCRIPTION}
            onChangeText={setDescription}
          />
          <ListGroup surface="raised">
            <ListRow label={t('topicReport.goodFaith')} control="check" on={goodFaith} onToggle={setGoodFaith} last />
          </ListGroup>
        </View>
      )}
    </MobileSheet>
  )
}
