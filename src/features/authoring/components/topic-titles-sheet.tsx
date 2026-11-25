import { zodResolver } from '@hookform/resolvers/zod'
import {
  topicTitlesSchema,
  MASTERY_TIERS,
  normalizeTitles,
  TITLE_MAX_LENGTH,
  titleLabel,
  titlesChanged,
  titlesDraft,
  type TitleLanguage,
  type TopicTitles,
} from '@joutio/client/authoring'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Badge, Button, Field, MobileSheet, Segmented, Text, tokens } from '@/design-system'
import { formatNumber, MASTERY_XP } from '@/features/topic/lib/format'
import { LANGUAGES } from './topic-sheets'
import { tierKey, useT } from '@/lib/i18n'

/**
 * Titres par palier (`creation.md` § 1, Titres, 2026-11-13) : le créateur nomme librement chacun des 7 paliers, en
 * français et en anglais. Un champ vide garde le repli « Or · Sujet », affiché en indication. Un seul Enregistrer.
 */
export function TopicTitlesSheet({
  open,
  topicName,
  titles,
  busy,
  onClose,
  onSave,
}: {
  open: boolean
  topicName: string
  titles: TopicTitles | null
  busy?: boolean
  onClose: () => void
  onSave: (titles: TopicTitles | null) => void
}) {
  const t = useT()
  const [language, setLanguage] = useState<TitleLanguage>('fr')
  const form = useForm({ resolver: zodResolver(topicTitlesSchema), mode: 'onChange', defaultValues: titlesDraft(titles) })
  const [french, english] = useWatch({ control: form.control, name: ['fr', 'en'] })
  const draft = { fr: french, en: english }
  useEffect(() => {
    if (!open) return
    setLanguage('fr')
    form.reset(titlesDraft(titles))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('workshop.titles')}
      subtitle={topicName}
      tall
      footer={
        <Button
          full
          loading={busy}
          disabled={!form.formState.isValid || !titlesChanged(titles, draft)}
          onPress={() => void form.handleSubmit((values) => onSave(normalizeTitles(values)))()}
        >
          {t('settings.save')}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[4] }}>
        <Text variant="callout" color="muted">
          {t('workshop.titlesText', { topic: topicName })}
        </Text>
        <Segmented<TitleLanguage> label={t('settings.language')} options={LANGUAGES} value={language} onChange={setLanguage} />
        {MASTERY_TIERS.map((tier) => {
          return (
            <View key={`${language}-${tier}`} style={{ gap: tokens.space[2] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
                <Badge variant="tier" tier={tier}>
                  {t(tierKey(tier))}
                </Badge>
                <Text variant="caption" color="muted">
                  {t('common.xp', { xp: formatNumber(MASTERY_XP[tier]) })}
                </Text>
              </View>
              <Controller
                control={form.control}
                name={`${language}.${tier}`}
                render={({ field }) => (
                  <Field
                    label={t(language === 'en' ? 'workshop.titleLabelEn' : 'workshop.titleLabel', { tier: t(tierKey(tier)) })}
                    placeholder={
                      language === 'en'
                        ? titleLabel(normalizeTitles(draft), tier, topicName, 'fr')
                        : t('workshop.tierTitle', { tier: t(tierKey(tier)), topic: topicName })
                    }
                    value={field.value}
                    maxLength={TITLE_MAX_LENGTH}
                    counter={t('common.counter', { count: field.value.length, max: TITLE_MAX_LENGTH })}
                    onChangeText={field.onChange}
                  />
                )}
              />
            </View>
          )
        })}
      </View>
    </MobileSheet>
  )
}
