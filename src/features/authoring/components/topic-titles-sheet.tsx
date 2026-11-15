import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Badge, Button, Field, MobileSheet, Segmented, Text, tokens } from '@/design-system'
import {
  MASTERY_TIERS,
  normalizeTitles,
  TITLE_MAX_LENGTH,
  titleLabel,
  titlesChanged,
  titlesDraft,
  tooLongTitle,
  type TitleLanguage,
  type TopicTitles,
} from '@joutio/client/authoring'
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
  const [draft, setDraft] = useState(() => titlesDraft(titles))
  useEffect(() => {
    if (!open) return
    setLanguage('fr')
    setDraft(titlesDraft(titles))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const invalid = tooLongTitle(draft) !== null
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('workshop.titles')}
      subtitle={topicName}
      tall
      footer={
        <Button full loading={busy} disabled={invalid || !titlesChanged(titles, draft)} onPress={() => onSave(normalizeTitles(draft))}>
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
          const value = draft[language][tier]
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
              <Field
                label={t(language === 'en' ? 'workshop.titleLabelEn' : 'workshop.titleLabel', { tier: t(tierKey(tier)) })}
                placeholder={language === 'en' ? titleLabel(normalizeTitles(draft), tier, topicName, 'fr') : t('workshop.tierTitle', { tier: t(tierKey(tier)), topic: topicName })}
                value={value}
                maxLength={TITLE_MAX_LENGTH}
                counter={t('common.counter', { count: value.length, max: TITLE_MAX_LENGTH })}
                onChangeText={(next) => setDraft({ ...draft, [language]: { ...draft[language], [tier]: next } })}
              />
            </View>
          )
        })}
      </View>
    </MobileSheet>
  )
}
