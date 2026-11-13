import { MAX_DESCRIPTION } from '@joutio/client-domain/authoring'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { Button, Field, ListGroup, ListRow, MobileSheet, RadioGroup, Segmented, Text, tokens, type CategoryCode } from '@/design-system'
import type { Language } from '@joutio/client-domain/api-types'
import { MAX_NAME } from '@joutio/client-domain/authoring'
import type { Localized } from '@joutio/client-domain/authoring'

export const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]
export const universeLabel = (category: CategoryCode) => tokens.category[category].label

export const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
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
  return (
    <MobileSheet open={open} onClose={onClose} title="Univers" tall>
      <RadioGroup label="Univers">
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
        title="Nouveau sujet"
        footer={
          <Button full size="L" loading={busy} disabled={name.trim() === ''} onPress={() => onCreate({ name: name.trim(), category })}>
            Créer le brouillon
          </Button>
        }
      >
        <View style={{ gap: tokens.space[4] }}>
          <Field
            label="Nom"
            placeholder="Par exemple, Châteaux de la Loire"
            value={name}
            maxLength={MAX_NAME}
            counter={`${name.length} / ${MAX_NAME}`}
            onChangeText={setName}
          />
          <ListGroup>
            <ListRow label="Univers" control="chevron" value={universeLabel(category)} onPress={() => setUniverseOpen(true)} last />
          </ListGroup>
          <Text variant="caption" color="muted">
            Vignette, traduction et questions se règlent ensuite sur la page du sujet.
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
          Enregistrer
        </Button>
      }
    >
      <View style={{ gap: tokens.space[4] }}>
        <Segmented<Language> label="Langue" options={LANGUAGES} value={language} onChange={setLanguage} />
        <Field
          key={language}
          label={language === 'fr' ? label : `${label} en anglais`}
          placeholder={placeholder[language]}
          hint={language === 'en' ? `Facultatif. En français : ${draft.fr.trim() || '—'}` : undefined}
          value={value}
          maxLength={max}
          counter={`${value.length} / ${max}`}
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
      title="Description"
      subtitle="Facultative, affichée sous le titre de la fiche"
      footer={
        <Button full loading={busy} disabled={changes.length === 0} onPress={() => onSave(changes)}>
          Enregistrer
        </Button>
      }
    >
      <View style={{ gap: tokens.space[4] }}>
        <Segmented<Language> label="Langue" options={LANGUAGES} value={language} onChange={setLanguage} />
        <Field
          key={language}
          label={language === 'fr' ? 'Description' : 'Description en anglais'}
          placeholder={language === 'fr' ? 'Ce que les joueurs vont trouver dans ce sujet' : 'What players will find in this topic'}
          hint={language === 'en' ? 'Facultative. Sans elle, les joueurs anglophones lisent la française.' : undefined}
          multiline
          value={value}
          maxLength={MAX_DESCRIPTION}
          counter={`${value.length} / ${MAX_DESCRIPTION}`}
          onChangeText={(next) => setDraft({ ...draft, [language]: next })}
        />
      </View>
    </MobileSheet>
  )
}
