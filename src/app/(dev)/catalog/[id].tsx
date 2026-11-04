import { Stack, useLocalSearchParams } from 'expo-router'
import { EmptyState, Screen, tokens, WarningIcon } from '@/design-system'
import { ThemeSwitch } from '@/dev/catalog/kit'
import { CATALOG } from '@/dev/catalog/registry'

export default function CatalogEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const entry = CATALOG.find((candidate) => candidate.id === id)
  const header = <Stack.Screen options={{ title: entry?.title ?? 'Introuvable', headerShown: !entry?.fullscreen }} />

  if (!entry) {
    return (
      <Screen nativeHeader scroll={false}>
        {header}
        <EmptyState fill icon={WarningIcon} title="Composant introuvable" />
      </Screen>
    )
  }
  if (entry.fullscreen)
    return (
      <>
        {header}
        <entry.Demo />
      </>
    )
  return (
    <Screen nativeHeader contentStyle={{ padding: tokens.space[5], gap: tokens.space[6] }} scrollProps={{ keyboardShouldPersistTaps: 'handled' }}>
      {header}
      <ThemeSwitch />
      <entry.Demo />
    </Screen>
  )
}
