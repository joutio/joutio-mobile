import { countryFlag, countryName, regionOfLocale, searchCountries, suggestedCountries } from '@joutio/client-domain/geo'
import { FlashList } from '@shopify/flash-list'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import {
  EmptyState,
  ListGroup,
  ListRow,
  MagnifyingGlassIcon,
  MobileSheet,
  RadioGroup,
  SearchField,
  SectionHeader,
  Text,
  tokens,
  useTheme,
} from '@/design-system'

/** Pays rendus par page : la feuille s'ouvre sans construire les 249 lignes. */
const PAGE_SIZE = 30

/** Région de l'appareil : `Intl` (Hermes) donne la locale système. */
const deviceRegion = () => {
  try {
    return regionOfLocale(Intl.DateTimeFormat().resolvedOptions().locale)
  } catch {
    return null
  }
}

/**
 * Sélecteur de pays (`editer-profil.md` § 4) : recherche sans accents (nom ou code), pays suggérés (appareil puis pays
 * les plus joués) et « Ne pas afficher », puis les 249 pays ISO triés par nom. Le choix s'applique aussitôt.
 * Liste virtualisée (`FlashList`) chargée par pages de {@link PAGE_SIZE} (2026-11-13) : la feuille s'ouvre vite.
 */
export function CountryPicker({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean
  onClose: () => void
  value: string | null
  onChange: (code: string | null) => void
}) {
  const { colors, radius } = useTheme()
  const [query, setQuery] = useState('')
  const [pages, setPages] = useState(1)
  const results = useMemo(() => searchCountries(query), [query])
  const visible = useMemo(() => results.slice(0, pages * PAGE_SIZE), [results, pages])
  const hasMore = visible.length < results.length
  const suggested = useMemo(() => suggestedCountries(deviceRegion()), [])

  const search = (next: string) => {
    setQuery(next)
    setPages(1)
  }
  const pick = (code: string | null) => {
    onChange(code)
    search('')
    onClose()
  }
  const close = () => {
    search('')
    onClose()
  }
  const row = (code: string, last: boolean) => (
    <ListRow
      key={code}
      leading={<Text variant="headline">{countryFlag(code)}</Text>}
      label={countryName(code)}
      control="radio"
      on={value === code}
      onToggle={() => pick(code)}
      last={last}
    />
  )

  const header =
    query.trim() === '' ? (
      <View style={{ gap: tokens.space[4], paddingBottom: tokens.space[4] }}>
        <SectionHeader title="Suggérés" />
        <RadioGroup label="Pays suggérés">
          <ListGroup>
            {suggested.map((code) => row(code, false))}
            <ListRow
              label="Ne pas afficher"
              sub="Ton pays n'apparaît pas sur ton profil"
              control="radio"
              on={value === null}
              onToggle={() => pick(null)}
              last
            />
          </ListGroup>
        </RadioGroup>
        <SectionHeader title="Tous les pays" />
      </View>
    ) : undefined

  return (
    <MobileSheet
      open={open}
      onClose={close}
      title="Pays"
      tall
      stickyHeader={<SearchField value={query} onChange={search} placeholder="Chercher un pays" label="Chercher un pays" />}
      loadMore={{ enabled: hasMore, resetKey: query, onLoadMore: () => setPages((count) => count + 1) }}
      renderList={(list) => (
        <FlashList
          {...list}
          data={visible}
          keyExtractor={(country) => country.code}
          maintainVisibleContentPosition={{ disabled: true }}
          onEndReached={() => {
            if (hasMore) setPages((count) => count + 1)
          }}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <EmptyState icon={MagnifyingGlassIcon} title="Aucun pays trouvé" description="Vérifie l'orthographe ou cherche par code (FR, BE…)." />
          }
          renderItem={({ item, index }) => {
            const first = index === 0
            const last = index === visible.length - 1
            return (
              <View
                style={{
                  overflow: 'hidden',
                  backgroundColor: colors.raised,
                  borderTopLeftRadius: first ? radius.lg : 0,
                  borderTopRightRadius: first ? radius.lg : 0,
                  borderBottomLeftRadius: last ? radius.lg : 0,
                  borderBottomRightRadius: last ? radius.lg : 0,
                }}
              >
                {row(item.code, last && !hasMore)}
              </View>
            )
          }}
        />
      )}
    />
  )
}
