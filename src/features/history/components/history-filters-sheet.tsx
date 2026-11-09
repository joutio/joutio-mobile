import { View } from 'react-native'
import { Button, ListGroup, ListRow, MobileSheet, RadioGroup, SectionHeader, tokens } from '@/design-system'
import type { HistoryFilterState, HistoryOpponentType, HistoryOutcome, HistorySort } from '../lib/history-service'

const TYPES: { value: HistoryOpponentType | undefined; label: string }[] = [
  { value: undefined, label: 'Toutes les parties' },
  { value: 'HUMAN', label: 'Duels' },
  { value: 'BOT', label: 'Entraînements' },
]

const OUTCOMES: { value: HistoryOutcome; label: string }[] = [
  { value: 'ALL', label: 'Tous' },
  { value: 'WIN', label: 'Victoires' },
  { value: 'LOSS', label: 'Défaites' },
  { value: 'DRAW', label: 'Nuls' },
]

export const HISTORY_SORTS: { value: HistorySort; label: string }[] = [
  { value: 'RECENT', label: 'Plus récentes' },
  { value: 'OLDEST', label: 'Plus anciennes' },
]

const countLabel = (count: number) => `${count} ${count > 1 ? 'parties' : 'partie'}`

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
  const reset = () => onReset()
  return (
    <MobileSheet
      open={open}
      onClose={onClose}
      title="Filtrer"
      action={
        <Button variant="plain" size="S" onPress={reset}>
          Réinitialiser
        </Button>
      }
      footer={
        <Button full onPress={onClose}>
          {`Afficher ${countLabel(count)}`}
        </Button>
      }
    >
      <View style={{ gap: tokens.space[6] }}>
        {!hideType && (
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader title="Type" />
            <ListGroup>
              <RadioGroup label="Type de partie">
                {TYPES.map((option, index) => (
                  <ListRow
                    key={option.label}
                    label={option.label}
                    control="radio"
                    on={filters.opponentType === option.value}
                    onToggle={() => onChange({ opponentType: option.value })}
                    last={index === TYPES.length - 1}
                  />
                ))}
              </RadioGroup>
            </ListGroup>
          </View>
        )}
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title="Résultat" />
          <ListGroup>
            <RadioGroup label="Résultat">
              {OUTCOMES.map((option, index) => (
                <ListRow
                  key={option.value}
                  label={option.label}
                  control="radio"
                  on={filters.outcome === option.value}
                  onToggle={() => onChange({ outcome: option.value })}
                  last={index === OUTCOMES.length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
        </View>
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title="Tri" />
          <ListGroup>
            <RadioGroup label="Tri">
              {HISTORY_SORTS.map((option, index) => (
                <ListRow
                  key={option.value}
                  label={option.label}
                  control="radio"
                  on={filters.sort === option.value}
                  onToggle={() => onChange({ sort: option.value })}
                  last={index === HISTORY_SORTS.length - 1}
                />
              ))}
            </RadioGroup>
          </ListGroup>
        </View>
      </View>
    </MobileSheet>
  )
}
