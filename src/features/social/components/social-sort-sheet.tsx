import { ListGroup, ListRow, MobileSheet, RadioGroup } from '@/design-system'
import type { PeopleSort } from '@joutio/client-domain/api-types'

/** Libellés seuls, comme le lab (`SOCIAL_SORTS`). */
export const SOCIAL_SORTS: { value: PeopleSort; label: string }[] = [
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
          {SOCIAL_SORTS.map((option, index) => (
            <ListRow
              key={option.value}
              label={option.label}
              control="radio"
              on={value === option.value}
              last={index === SOCIAL_SORTS.length - 1}
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
