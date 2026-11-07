import { useState } from 'react'
import { Screen, SearchHeader, NotificationBell, Text, tokens } from '@/design-system'
import { ThemeSwitch } from './kit'

export function SearchHeaderDemo() {
  const [query, setQuery] = useState('')
  const [action, setAction] = useState('')
  return (
    <Screen
      header={
        <SearchHeader
          title="Recherche"
          value={query}
          onChange={setQuery}
          placeholder="Chercher un sujet"
          onFilter={() => setAction('Filtres')}
          notifications={<NotificationBell count={3} onPress={() => setAction('Notifications')} />}
          onGlobalSearch={() => setAction('Recherche globale')}
        />
      }
      contentStyle={{ padding: tokens.space[5], gap: tokens.space[5] }}
    >
      <ThemeSwitch />
      <Text>Touche le champ : il monte dans l’en-tête. Le filtre disparaît. Annuler efface la saisie et restaure le titre et le filtre.</Text>
      <Text>{query ? `Recherche : ${query}` : 'Aucune recherche'}</Text>
      <Text>{action}</Text>
    </Screen>
  )
}
