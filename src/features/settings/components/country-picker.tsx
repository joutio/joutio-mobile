import { countryFlag, countryName, regionOfLocale, searchCountries, suggestedCountries } from '@joutio/client-domain/geo'
import { useState } from 'react'
import { View } from 'react-native'
import { EmptyState, ListGroup, ListRow, MagnifyingGlassIcon, MobileSheet, RadioGroup, SearchField, SectionHeader, Text, tokens } from '@/design-system'

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
  const [query, setQuery] = useState('')
  const results = searchCountries(query)
  const pick = (code: string | null) => {
    onChange(code)
    setQuery('')
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
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Pays"
      tall
      stickyHeader={<SearchField value={query} onChange={setQuery} placeholder="Chercher un pays" label="Chercher un pays" />}
    >
      <View style={{ gap: tokens.space[4] }}>
        {query.trim() === '' && (
          <>
            <SectionHeader title="Suggérés" />
            <RadioGroup label="Pays suggérés">
              <ListGroup>
                {suggestedCountries(deviceRegion()).map((code) => row(code, false))}
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
          </>
        )}
        {results.length > 0 ? (
          <RadioGroup label="Pays">
            <ListGroup>{results.map(({ code }, index) => row(code, index === results.length - 1))}</ListGroup>
          </RadioGroup>
        ) : (
          <EmptyState icon={MagnifyingGlassIcon} title="Aucun pays trouvé" description="Vérifie l'orthographe ou cherche par code (FR, BE…)." />
        )}
      </View>
    </MobileSheet>
  )
}
