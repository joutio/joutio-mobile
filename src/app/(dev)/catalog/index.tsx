import { router } from 'expo-router'
import { ArrowRightIcon } from '@/design-system'
import { useEntryStore } from '@/shared/stores/entry-store'
import { View } from 'react-native'
import { ListRow, Screen, SectionHeader, tokens, useTheme } from '@/design-system'
import { ThemeSwitch } from '@/dev/catalog/kit'
import { CATALOG, ROW_TITLES } from '@/dev/catalog/registry'

/** Catalogue de dev : miroir des fiches `/components/<id>` du lab, pour comparer en sombre et en clair. */
export default function CatalogIndex() {
  const { colors, radius } = useTheme()
  const enter = useEntryStore((state) => state.enter)
  const rows = [1, 2, 3, 4, 5, 6, 7, 8] as const
  return (
    <Screen nativeHeader contentStyle={{ padding: tokens.space[5], gap: tokens.space[6] }}>
      <ThemeSwitch />
      <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
        <ListRow
          icon={ArrowRightIcon}
          label="Ouvrir l'app"
          sub="Connexion, onboarding ou accueil selon la session"
          strong
          last
          onPress={() => {
            enter()
            router.replace('/')
          }}
        />
      </View>
      {rows.map((row) => {
        const entries = CATALOG.filter((entry) => entry.row === row)
        return (
          <View key={row} style={{ gap: tokens.space[3] }}>
            <SectionHeader title={`${row}. ${ROW_TITLES[row]}`} />
            <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' }}>
              {entries.map((entry, index) => (
                <ListRow
                  key={entry.id}
                  label={entry.title}
                  sub={entry.spec}
                  last={index === entries.length - 1}
                  onPress={() => router.push(`/catalog/${entry.id}`)}
                />
              ))}
            </View>
          </View>
        )
      })}
    </Screen>
  )
}
