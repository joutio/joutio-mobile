import { ListGroup, ListRow, MobileSheet, RadioGroup } from '@/design-system'
import type { PeopleSort } from '@/shared/types/bff'

/** Libellés seuls, comme le lab (`SOCIAL_SORTS`). */
const OPTIONS: { value: PeopleSort; label: string }[] = [
  { value: 'PRESENCE', label: 'Présence' },
  { value: 'RECENT', label: 'Récents' },
  { value: 'ELO', label: 'Elo' },
  { value: 'ALPHA', label: 'Alphabétique' },
]

/** Feuille « Trier par » de l'annuaire Social (`social.md` § 2). */
export function SocialSortSheet({
  open,
  onClose,
  value,
  onChange,
}: {
  open: boolean
  onClose: () => void
  value: PeopleSort
  onChange: (sort: PeopleSort) => void
}) {
  return (
    <MobileSheet open={open} onClose={onClose} title="Trier par">
      <ListGroup>
        <RadioGroup label="Trier par">
          {OPTIONS.map((option, index) => (
            <ListRow
              key={option.value}
              label={option.label}
              control="radio"
              on={value === option.value}
              last={index === OPTIONS.length - 1}
              onToggle={() => {
                onChange(option.value)
                onClose()
              }}
            />
          ))}
        </RadioGroup>
      </ListGroup>
    </MobileSheet>
  )
}
