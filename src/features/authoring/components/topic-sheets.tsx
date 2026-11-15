import { MAX_DESCRIPTION } from '@joutio/client/authoring'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Button, Field, ListGroup, ListRow, MobileSheet, RadioGroup, Segmented, Text, tokens, type CategoryCode } from '@/design-system'
import type { Language } from '@joutio/client/api-types'
import { MAX_NAME } from '@joutio/client/authoring'
import type { Localized } from '@joutio/client/authoring'
import { LANGUAGE_NAME, categoryKey, t, useT } from '@/lib/i18n'

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
  const [name, setName] = useState('')
  const [category, setCategory] = useState<CategoryCode>('GENERAL')
  const [universeOpen, setUniverseOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    setName('')
    setCategory('GENERAL')
  }, [open])
  return (
    <>
      <MobileSheet
        open={open}
        onClose={onClose}
        title={t('workshop.newTopic')}
        footer={
          <Button full size="L" loading={busy} disabled={name.trim() === ''} onPress={() => onCreate({ name: name.trim(), category })}>
            {t('workshop.createDraft')}
          </Button>
        }
      >
        <View style={{ gap: tokens.space[4] }}>
          <Field
            label={t('workshop.name')}
            placeholder={t('workshop.namePlaceholder')}
            value={name}
            maxLength={MAX_NAME}
            counter={t('mobile.authoring.counter', { count: name.length, max: MAX_NAME })}
            onChangeText={setName}
          />
          <ListGroup>
            <ListRow label={t('topics.universes')} control="chevron" value={universeLabel(category)} onPress={() => setUniverseOpen(true)} last />
          </ListGroup>
          <Text variant="caption" color="muted">
            {t('workshop.newTopicText')}
          </Text>
        </View>
      </MobileSheet>
      <UniverseSheet open={open && universeOpen} value={category} onClose={() => setUniverseOpen(false)} onChange={setCategory} />
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
  max,
  placeholder,
  busy,
  onClose,
  onSave,
}: {
  open: boolean
  title: string
  label: string
  initial: Localized
  max: number
  placeholder: Localized
  busy?: boolean
  onClose: () => void
  onSave: (value: Localized) => void
}) {
  const t = useT()
  const [language, setLanguage] = useState<Language>('fr')
  const [draft, setDraft] = useState<Localized>(initial)
  useEffect(() => {
    if (!open) return
    setLanguage('fr')
    setDraft(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const value = draft[language]
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <Button full loading={busy} disabled={draft.fr.trim() === ''} onPress={() => onSave({ fr: draft.fr.trim(), en: draft.en.trim() })}>
          {t('settings.save')}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[4] }}>
        <Segmented<Language> label={t('settings.language')} options={LANGUAGES} value={language} onChange={setLanguage} />
        <Field
          key={language}
          label={language === 'fr' ? label : t('workshop.inEnglish', { label })}
          placeholder={placeholder[language]}
          hint={language === 'en' ? t('workshop.englishHint', { text: draft.fr.trim() || '—' }) : undefined}
          value={value}
          maxLength={max}
          counter={t('mobile.authoring.counter', { count: value.length, max })}
          onChangeText={(next) => setDraft({ ...draft, [language]: next })}
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
  const [draft, setDraft] = useState<Localized>(initial)
  useEffect(() => {
    if (!open) return
    setLanguage('fr')
    setDraft(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])
  const value = draft[language]
  const changes = (['fr', 'en'] as const)
    .filter((code) => draft[code].trim() !== initial[code].trim())
    .map((code) => ({ language: code, description: draft[code].trim() === '' ? null : draft[code].trim() }))
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('workshop.description')}
      subtitle={t('workshop.descriptionSub')}
      footer={
        <Button full loading={busy} disabled={changes.length === 0} onPress={() => onSave(changes)}>
          {t('settings.save')}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[4] }}>
        <Segmented<Language> label={t('settings.language')} options={LANGUAGES} value={language} onChange={setLanguage} />
        <Field
          key={language}
          label={language === 'fr' ? t('workshop.description') : t('mobile.authoring.descriptionEn')}
          placeholder={language === 'fr' ? t('workshop.descriptionPlaceholder') : 'What players will find in this topic'}
          hint={language === 'en' ? t('mobile.authoring.descriptionEnHint') : undefined}
          multiline
          value={value}
          maxLength={MAX_DESCRIPTION}
          counter={t('mobile.authoring.counter', { count: value.length, max: MAX_DESCRIPTION })}
          onChangeText={(next) => setDraft({ ...draft, [language]: next })}
        />
      </View>
    </MobileSheet>
  )
}
