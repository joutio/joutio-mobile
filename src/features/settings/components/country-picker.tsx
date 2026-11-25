import { countryFlag, countryName, regionOfLocale, searchCountries, suggestedCountries } from '@joutio/client/core/geo'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import {
  EmptyState,
  FeedFooter,
  ListGroup,
  ListRow,
  MagnifyingGlassIcon,
  MobileSheet,
  RadioGroup,
  SearchField,
  SectionHeader,
  Text,
  tokens,
} from '@/design-system'
import { clientSource, feedFooterProps } from '@/shared/utils/paging'
import { currentLanguage, useT } from '@/lib/i18n'

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
 * Lignes chargées par pages de {@link PAGE_SIZE} (2026-11-13) : la feuille s'ouvre vite. Rendue en `children` de la
 * feuille (2026-11-14) : une `FlashList` enveloppe son défilement dans une vue mesurée à 0 de haut, la feuille
 * paraissait vide.
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
  const t = useT()
  const [query, setQuery] = useState('')
  const [pages, setPages] = useState(1)
  const results = useMemo(() => searchCountries(query), [query])
  const visible = useMemo(() => results.slice(0, pages * PAGE_SIZE), [results, pages])
  const hasMore = visible.length < results.length
  // Même forme qu'une liste paginée : le pied annonce la page suivante, puis la fin (2026-11-14).
  const source = clientSource(pages, setPages, hasMore)
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
      label={countryName(code, currentLanguage())}
      control="radio"
      on={value === code}
      onToggle={() => pick(code)}
      last={last}
    />
  )

  return (
    <MobileSheet
      open={open}
      onClose={close}
      title={t('settings.country')}
      tall
      stickyHeader={<SearchField value={query} onChange={search} placeholder={t('settings.countrySearch')} label={t('settings.countrySearch')} />}
      loadMore={{ enabled: hasMore, resetKey: query, onLoadMore: () => source.fetchNextPage() }}
    >
      <View style={{ gap: tokens.space[4] }}>
        {query.trim() === '' && (
          <>
            <SectionHeader title={t('country.suggested')} />
            <RadioGroup label={t('mobile.country.suggestedLabel')}>
              <ListGroup>
                {suggested.map((code) => row(code, false))}
                <ListRow label={t('mobile.country.hide')} sub={t('country.hiddenSub')} control="radio" on={value === null} onToggle={() => pick(null)} last />
              </ListGroup>
            </RadioGroup>
            <SectionHeader title={t('country.all')} />
          </>
        )}
        {visible.length === 0 ? (
          <EmptyState icon={MagnifyingGlassIcon} title={t('settings.noCountry')} description={t('country.noResultText')} />
        ) : (
          <>
            <RadioGroup label={t('country.all')}>
              <ListGroup>{visible.map((country, index) => row(country.code, index === visible.length - 1))}</ListGroup>
            </RadioGroup>
            <FeedFooter {...feedFooterProps(source)} endLabel={t('mobile.country.allSeen')} />
          </>
        )}
      </View>
    </MobileSheet>
  )
}
