import { zodResolver } from '@hookform/resolvers/zod'
import { CONTENT_NOTICE_CATEGORIES, CONTENT_NOTICES_ENDPOINT, type ContentNoticeCategory, type ContentNoticeRequest } from '@joutio/client/api-types'
import { contentNoticeSchema, MAX_NOTICE_DESCRIPTION } from '@joutio/client/forms'
import { buildShareUrl } from '@joutio/client/share'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'
import { Button, Field, ListGroup, ListRow, MobileSheet, Text, toast, tokens } from '@/design-system'
import { useMe } from '@/features/me'
import { api } from '@/lib/api'
import { useT, type MessageKey } from '@/lib/i18n'

/**
 * Signaler un sujet depuis sa fiche (2026-11-15) : notification de contenu illicite (LCEN/DSA), traitée par la
 * modération dans la console. Lien du sujet, pseudonyme et e-mail du joueur sont remplis d'office ; le formulaire
 * repart à zéro à chaque ouverture.
 */
export function ReportTopicSheet({ open, onClose, topicId, name }: { open: boolean; onClose: () => void; topicId: string; name: string }) {
  const t = useT()
  const me = useMe()
  const form = useForm({ resolver: zodResolver(contentNoticeSchema), mode: 'onChange', defaultValues: { description: '', goodFaith: false } })
  const [sent, setSent] = useState(false)
  const { reset } = form
  useEffect(() => {
    if (!open) return
    reset()
    setSent(false)
  }, [open, reset])
  const report = useMutation({
    mutationFn: ({ category, description, goodFaith }: { category: ContentNoticeCategory; description: string; goodFaith: boolean }) =>
      api.post<unknown>(CONTENT_NOTICES_ENDPOINT, {
        name: me.data?.pseudonym ?? '',
        email: me.data?.email ?? '',
        quality: category === 'COPYRIGHT' || category === 'IMAGE_RIGHTS' ? 'RIGHTS_HOLDER' : 'THIRD_PARTY',
        contentUrl: buildShareUrl({ kind: 'topic', id: topicId }),
        category,
        description,
        goodFaith,
      } satisfies ContentNoticeRequest),
    onSuccess: () => setSent(true),
    onError: () => toast.error(t('report.error'), { description: t('home.errorText') }),
  })
  const ready = form.formState.isValid && Boolean(me.data?.email)
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
          <Button full disabled={!ready} loading={report.isPending} onPress={() => void form.handleSubmit((values) => report.mutate(values))()}>
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
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <ListGroup surface="raised">
                {CONTENT_NOTICE_CATEGORIES.map((item, index) => (
                  <ListRow
                    key={item}
                    label={t(`topicReport.reason.${item}` as MessageKey)}
                    sub={t(`topicReport.reason.${item}.sub` as MessageKey)}
                    control="radio"
                    on={field.value === item}
                    onToggle={() => field.onChange(item)}
                    last={index === CONTENT_NOTICE_CATEGORIES.length - 1}
                  />
                ))}
              </ListGroup>
            )}
          />
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <Field label={t('topicReport.description')} placeholder={t('topicReport.placeholder')} multiline value={field.value} maxLength={MAX_NOTICE_DESCRIPTION} onChangeText={field.onChange} />
            )}
          />
          <Controller
            control={form.control}
            name="goodFaith"
            render={({ field }) => (
              <ListGroup surface="raised">
                <ListRow label={t('topicReport.goodFaith')} control="check" on={field.value} onToggle={field.onChange} last />
              </ListGroup>
            )}
          />
        </View>
      )}
    </MobileSheet>
  )
}
