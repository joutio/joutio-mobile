import { View } from 'react-native'
import { Button, ListGroup, ListRow, MobileSheet, RadioGroup, SectionHeader, tokens } from '@/design-system'
import type { HistoryFilterState, HistoryOpponentType, HistoryOutcome, HistorySort } from '@joutio/client/profile'
import { t, useT } from '@/lib/i18n'

const TYPES = (): { value: HistoryOpponentType | undefined; label: string }[] => [
  { value: undefined, label: t('pending.games') },
  { value: 'HUMAN', label: t('history.typeDuels') },
  { value: 'BOT', label: t('history.typeTraining') },
]

const OUTCOMES = (): { value: HistoryOutcome; label: string }[] => [
  { value: 'ALL', label: t('home.all') },
  { value: 'WIN', label: t('profile.wins') },
  { value: 'LOSS', label: t('profile.losses') },
  { value: 'DRAW', label: t('profile.draws') },
]

export const HISTORY_SORTS = (): { value: HistorySort; label: string }[] => [
  { value: 'RECENT', label: t('history.sortRecent') },
  { value: 'OLDEST', label: t('history.sortOldest') },
]

const countLabel = (count: number) => t(count > 1 ? 'history.countMany' : 'history.countOne', { count })

export interface HistoryFiltersSheetProps {
  open: boolean
  onClose: () => void
  filters: HistoryFilterState
  onChange: (patch: Partial<HistoryFilterState>) => void
  onReset: () => void
  /** Sur une page déjà filtrée sur un joueur, un entraînement contre un bot n'est pas ce joueur. */
  hideType?: boolean
  count: number
}

/** Feuille Filtrer de l'historique (`historique.md` § 3). */
export function HistoryFiltersSheet({ open, onClose, filters, onChange, onReset, hideType = false, count }: HistoryFiltersSheetProps) {
  const t = useT()
  const reset = () => onReset()
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title={t('titles.filter')}
      action={
        <Button variant="plain" size="S" onPress={reset}>
          {t('topics.reset')}
        </Button>
      }
      footer={
        <Button full onPress={onClose}>
          {t('history.show', { count: countLabel(count) })}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[6] }}>
        {!hideType && (
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader title={t('mobile.history.type')} />
            <ListGroup>
              <RadioGroup label={t('history.type')}>
                {TYPES().map((option, index) => (
                  <ListRow
                    key={option.label}
                    label={option.label}
                    control="radio"
                    on={filters.opponentType === option.value}
                    onToggle={() => onChange({ opponentType: option.value })}
                    last={index === TYPES().length - 1}
                  />
                ))}
              </RadioGroup>
            </ListGroup>
          </View>
        )}
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title={t('pending.result')} />
          <ListGroup>
            <RadioGroup label={t('pending.result')}>
              {OUTCOMES().map((option, index) => (
                <ListRow
                  key={option.value}
                  label={option.label}
                  control="radio"
                  on={filters.outcome === option.value}
                  onToggle={() => onChange({ outcome: option.value })}
                  last={index === OUTCOMES().length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title={t('mobile.history.sort')} />
          <ListGroup>
            <RadioGroup label={t('mobile.history.sort')}>
              {HISTORY_SORTS().map((option, index) => (
                <ListRow
                  key={option.value}
                  label={option.label}
                  control="radio"
                  on={filters.sort === option.value}
                  onToggle={() => onChange({ sort: option.value })}
                  last={index === HISTORY_SORTS().length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
        </View>
      </View>
    </MobileSheet>
  )
}
