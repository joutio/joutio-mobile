import DateTimePicker from '@expo/ui/community/datetime-picker'
import { birthDateIssue, isoDay, MIN_AGE } from '@joutio/client-domain/profile'
import { useState } from 'react'
import { Platform, View } from 'react-native'
import { CakeIcon, ListGroup, ListRow, Text, tokens, useTheme } from '@/design-system'

/** Date de départ du sélecteur sans valeur : 20 ans avant aujourd'hui. */
const defaultDate = () => {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 20)
  return date
}

const toDate = (iso: string) => new Date(`${iso}T12:00:00`)

export const formatBirthDate = (iso: string | null | undefined) =>
  iso ? toDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'À renseigner'

/** Message d'erreur de la date, ou `undefined` si elle est acceptable. */
export function birthDateError(iso: string | null): string | undefined {
  if (!iso) return undefined
  const issue = birthDateIssue(iso, isoDay(new Date()))
  if (issue === 'underage') return `Il faut avoir au moins ${MIN_AGE} ans pour jouer sur Joutio.`
  if (issue) return "Cette date n'est pas valide."
  return undefined
}

/**
 * Sélecteur natif de la date de naissance (`editer-profil.md` § 5) : roues iOS dans la page, dialogue calendrier
 * Android ouvert depuis la ligne. Valeur ISO `AAAA-MM-JJ`.
 */
export function BirthDatePicker({ value, onChange }: { value: string | null; onChange: (iso: string) => void }) {
  const { colors } = useTheme()
  const [androidOpen, setAndroidOpen] = useState(false)
  const error = birthDateError(value)
  const picker = (
    <DateTimePicker
      value={value ? toDate(value) : defaultDate()}
      mode="date"
      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      maximumDate={new Date()}
      minimumDate={new Date(1900, 0, 1)}
      accentColor={colors.accent}
      onValueChange={(_event, date) => {
        setAndroidOpen(false)
        onChange(isoDay(date))
      }}
      onDismiss={() => setAndroidOpen(false)}
    />
  )
  return (
    <View style={{ gap: tokens.space[2] }}>
      {Platform.OS === 'ios' ? (
        picker
      ) : (
        <ListGroup surface="surface">
          <ListRow icon={CakeIcon} label="Date de naissance" value={formatBirthDate(value)} control="chevron" onPress={() => setAndroidOpen(true)} last />
        </ListGroup>
      )}
      {Platform.OS === 'android' && androidOpen && picker}
      {error ? (
        <Text variant="caption" color="wrong">
          {error}
        </Text>
      ) : (
        <Text variant="caption" color="muted">
          Privée : elle ne s'affiche jamais sur ton profil.
        </Text>
      )}
    </View>
  )
}
