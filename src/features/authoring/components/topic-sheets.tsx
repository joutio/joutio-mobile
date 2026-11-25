import { MAX_DESCRIPTION, createTopicSchema, topicDescriptionsSchema, topicNamesSchema, MAX_NAME, type Localized } from '@joutio/client/authoring'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { Controller, useForm, useFormState, useWatch } from 'react-hook-form'
import { View } from 'react-native'
import { Button, Field, ListGroup, ListRow, MobileSheet, Notice, RadioGroup, Segmented, Text, toCategoryCode, tokens, type CategoryCode } from '@/design-system'
import type { Language } from '@joutio/client/core/types'
import { LANGUAGE_NAME, categoryKey, t, useT } from '@/lib/i18n'
import { router } from '@/shared/navigation/router'
import { topicName } from '@/shared/utils/topic-name'
import { useSameNameTopic } from '../hooks/use-authoring'

export const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]
/** Nom de l'univers dans la langue courante (lu au rendu). */
export const universeLabel = (category: CategoryCode) => t(categoryKey(category))

export const LANGUAGES = [
  { value: 'fr', label: LANGUAGE_NAME.fr },
  { value: 'en', label: LANGUAGE_NAME.en },
] as const

/** Univers : 17 choix, la feuille se ferme au choix. */
export function UniverseSheet({
  open,
  value,
  onClose,
  onChange,
  busy = false,
}: {
  open: boolean
  value: CategoryCode
  onClose: () => void
  onChange: (category: CategoryCode) => void | Promise<unknown>
  busy?: boolean
}) {
  const t = useT()
  return (
    <MobileSheet open={open} onClose={onClose} title={t('topics.universes')} tall>
      <RadioGroup label={t('topics.universes')}>
        <ListGroup>
          {UNIVERSES.map((option, index) => (
            <ListRow
              key={option}
              label={universeLabel(option)}
              control="radio"
              on={value === option}
              disabled={busy}
              onToggle={() => {
                const result = onChange(option)
                if (result instanceof Promise) void result.then(onClose).catch(() => undefined)
                else onClose()
              }}
              last={index === UNIVERSES.length - 1}
            />
          ))}
        </ListGroup>
      </RadioGroup>
    </MobileSheet>
  )
}

/** Nouveau sujet : le nom et l'univers suffisent, le reste se règle sur la page du sujet. */
export function CreateTopicSheet({
  open,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean
  busy: boolean
  onClose: () => void
  onCreate: (topic: { name: string; category: CategoryCode }) => void
}) {
  const t = useT()
  const form = useForm({ resolver: zodResolver(createTopicSchema), mode: 'onChange', defaultValues: { name: '', category: 'GENERAL' } })
  const [name, categoryValue] = useWatch({ control: form.control, name: ['name', 'category'] })
  const category = toCategoryCode(categoryValue)
  const sameName = useSameNameTopic(name)
  const [universeOpen, setUniverseOpen] = useState(false)
  const { reset } = form
  useEffect(() => {
    if (open) reset()
  }, [open, reset])
  return (
    <>
      <MobileSheet
        open={open}
        onClose={onClose}
        title={t('workshop.newTopic')}
        footer={
          <Button
            full
            size="L"
            loading={busy}
            disabled={!form.formState.isValid}
            onPress={() => void form.handleSubmit((values) => onCreate({ name: values.name, category: toCategoryCode(values.category) }))()}
          >
            {t('workshop.createDraft')}
          </Button>
        }
      >
        <View style={{ gap: tokens.space[4] }}>
          <Controller
            control={form.control}
            name="name"
            render={({ field }) => (
              <Field
                label={t('workshop.name')}
                placeholder={t('workshop.namePlaceholder')}
                value={field.value}
                maxLength={MAX_NAME}
                counter={t('mobile.authoring.counter', { count: field.value.length, max: MAX_NAME })}
                onChangeText={field.onChange}
              />
            )}
          />
          {sameName && (
            <Notice
              tone="warning"
              title={t('workshop.duplicateName')}
              message={topicName(sameName.names)}
              action={{
                label: t('workshop.duplicateNameOpen'),
                onPress: () => {
                  onClose()
                  router.push({ pathname: '/home/topic/[id]', params: { id: sameName.topicId } })
                },
              }}
            />
          )}
          <ListGroup>
            <ListRow label={t('topics.universes')} control="chevron" value={universeLabel(category)} onPress={() => setUniverseOpen(true)} last />
          </ListGroup>
          <Text variant="caption" color="muted">
            {t('workshop.newTopicText')}
          </Text>
        </View>
      </MobileSheet>
      <UniverseSheet
        open={open && universeOpen}
        value={category}
        onClose={() => setUniverseOpen(false)}
        onChange={(code) => form.setValue('category', code, { shouldValidate: true })}
      />
    </>
  )
}

/**
 * Champ traduisible, dans sa feuille : onglets Français / English, et dessous le champ de la langue choisie. Le
 * français est obligatoire ; en anglais, l'aide rappelle le texte français à traduire. Repart des valeurs
 * enregistrées à chaque ouverture.
 */
export function LocalizedFieldSheet({
  open,
  title,
  label,
  initial,
  placeholder,
  busy,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  label: string
  initial: Localized
  placeholder: Localized
  busy?: boolean
  onClose: () => void
  onSave: (value: Localized) => void
}) {
  const t = useT()
  const [language, setLanguage] = useState<Language>('fr')
  const form = useForm({ resolver: zodResolver(topicNamesSchema), mode: 'onChange', defaultValues: initial })
  const french = useWatch({ control: form.control, name: 'fr' })
  useEffect(() => {
    if (!open) return
    setLanguage('fr')
    form.reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button full loading={busy} disabled={!form.formState.isValid} onPress={() => void form.handleSubmit(onSave)()}>
          {t('settings.save')}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[4] }}>
        <Segmented<Language> label={t('settings.language')} options={LANGUAGES} value={language} onChange={setLanguage} />
        <Controller
          key={language}
          control={form.control}
          name={language}
          render={({ field }) => (
            <Field
              label={language === 'fr' ? label : t('workshop.inEnglish', { label })}
              placeholder={placeholder[language]}
              hint={language === 'en' ? t('workshop.englishHint', { text: french.trim() || '—' }) : undefined}
              value={field.value}
              maxLength={MAX_NAME}
              counter={t('mobile.authoring.counter', { count: field.value.length, max: MAX_NAME })}
              onChangeText={field.onChange}
            />
          )}
        />
      </View>
    </MobileSheet>
  )
}

/**
 * Description du sujet (2026-11-13) : quelques phrases sous le titre de la fiche, une par langue comme le nom.
 * Facultative ; vide, celle de la langue est effacée. Seules les langues modifiées sont envoyées.
 */
export function DescriptionSheet({
  open,
  initial,
  busy,
  onClose,
  onSave,
}: {
  open: boolean
  initial: Localized
  busy?: boolean
  onClose: () => void
  onSave: (changes: { language: Language; description: string | null }[]) => void
}) {
  const t = useT()
  const [language, setLanguage] = useState<Language>('fr')
  const form = useForm({ resolver: zodResolver(topicDescriptionsSchema), mode: 'onChange', defaultValues: initial })
  const { isValid } = useFormState({ control: form.control })
  const [french, english] = useWatch({ control: form.control, name: ['fr', 'en'] })
  useEffect(() => {
    if (!open) return
    setLanguage('fr')
    form.reset(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const changesOf = (values: Localized) =>
    (['fr', 'en'] as const)
      .filter((code) => values[code].trim() !== initial[code].trim())
      .map((code) => ({ language: code, description: values[code].trim() === '' ? null : values[code].trim() }))
  const changed = changesOf({ fr: french, en: english }).length > 0
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('workshop.description')}
      subtitle={t('workshop.descriptionSub')}
      footer={
        <Button full loading={busy} disabled={!changed || !isValid} onPress={() => void form.handleSubmit((values) => onSave(changesOf(values)))()}>
          {t('settings.save')}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[4] }}>
        <Segmented<Language> label={t('settings.language')} options={LANGUAGES} value={language} onChange={setLanguage} />
        <Controller
          key={language}
          control={form.control}
          name={language}
          render={({ field }) => (
            <Field
              label={language === 'fr' ? t('workshop.description') : t('mobile.authoring.descriptionEn')}
              placeholder={language === 'fr' ? t('workshop.descriptionPlaceholder') : 'What players will find in this topic'}
              hint={language === 'en' ? t('mobile.authoring.descriptionEnHint') : undefined}
              multiline
              value={field.value}
              maxLength={MAX_DESCRIPTION}
              counter={t('mobile.authoring.counter', { count: field.value.length, max: MAX_DESCRIPTION })}
              onChangeText={field.onChange}
            />
          )}
        />
      </View>
    </MobileSheet>
  )
}
