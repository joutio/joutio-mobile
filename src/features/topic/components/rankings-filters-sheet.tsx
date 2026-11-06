import { View } from 'react-native'
import { Button, ListGroup, ListRow, MobileSheet, RadioGroup, SectionHeader, tokens } from '@/design-system'
import type { LeaderboardPeriod, LeaderboardScope } from '@/shared/types/bff'
import type { RankingFilterState } from '../lib/topic-service'

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'ALL_TIME', label: 'Depuis toujours' },
  { value: 'MONTHLY', label: 'Ce mois' },
]

const SCOPES: { value: LeaderboardScope; label: string }[] = [
  { value: 'WORLD', label: 'Mondial' },
  { value: 'FOLLOWING', label: 'Suivis' },
  { value: 'COUNTRY', label: 'Pays' },
]

export interface RankingsFiltersSheetProps {
  open: boolean
  onClose: () => void
  filters: RankingFilterState
  onChange: (patch: Partial<RankingFilterState>) => void
  onReset: () => void
  /** Le joueur n'a pas de pays : la portée Pays est masquée. */
  hasCountry: boolean
}

/** Feuille Filtrer des classements (`classements.md` § 3). */
export function RankingsFiltersSheet({ open, onClose, filters, onChange, onReset, hasCountry }: RankingsFiltersSheetProps) {
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Filtrer"
      action={
        <Button variant="plain" size="S" onPress={onReset}>
          Réinitialiser
        </Button>
      }
      footer={
        <Button full onPress={onClose}>
          Afficher le classement
        </Button>
      }
    >
      <View style={{ gap: tokens.space[6] }}>
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title="Période" />
          <ListGroup>
            <RadioGroup label="Période">
              {PERIODS.map((option, index) => (
                <ListRow
                  key={option.value}
                  label={option.label}
                  control="radio"
                  on={filters.period === option.value}
                  onToggle={() => onChange({ period: option.value })}
                  last={index === PERIODS.length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title="Portée" />
          <ListGroup>
            <RadioGroup label="Portée">
              {(hasCountry ? SCOPES : SCOPES.filter((option) => option.value !== 'COUNTRY')).map((option, index, options) => (
                <ListRow
                  key={option.value}
                  label={option.label}
                  control="radio"
                  on={filters.scope === option.value}
                  onToggle={() => onChange({ scope: option.value })}
                  last={index === options.length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
        </View>
      </View>
    </MobileSheet>
  )
}
