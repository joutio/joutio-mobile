import { View } from 'react-native'
import { Button, ListGroup, ListRow, MobileSheet, RadioGroup, SectionHeader, tokens } from '@/design-system'
import type { LeaderboardPeriod, LeaderboardScope, RankingFilters } from '@joutio/client/topics'
import { t, useT } from '@/lib/i18n'

type RankingFilterState = Pick<RankingFilters, 'period' | 'scope'>

const PERIODS = (): { value: LeaderboardPeriod; label: string }[] => [
  { value: 'ALL_TIME', label: t('board.allTime') },
  { value: 'MONTHLY', label: t('mobile.rankings.month') },
]

const SCOPES = (): { value: LeaderboardScope; label: string }[] => [
  { value: 'WORLD', label: t('mobile.rankings.world') },
  { value: 'FOLLOWING', label: t('home.followed') },
  { value: 'COUNTRY', label: t('settings.country') },
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
  const t = useT()
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('titles.filter')}
      action={
        <Button variant="plain" size="S" onPress={onReset}>
          {t('topics.reset')}
        </Button>
      }
      footer={
        <Button full onPress={onClose}>
          {t('mobile.rankings.show')}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[6] }}>
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title={t('board.period')} />
          <ListGroup>
            <RadioGroup label={t('board.period')}>
              {PERIODS().map((option, index) => (
                <ListRow
                  key={option.value}
                  label={option.label}
                  control="radio"
                  on={filters.period === option.value}
                  onToggle={() => onChange({ period: option.value })}
                  last={index === PERIODS().length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title={t('mobile.rankings.scope')} />
          <ListGroup>
            <RadioGroup label={t('mobile.rankings.scope')}>
              {(hasCountry ? SCOPES() : SCOPES().filter((option) => option.value !== 'COUNTRY')).map((option, index, options) => (
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
