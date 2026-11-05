import { ListGroup, ListRow, MobileSheet, RadioGroup } from '@/design-system'
import type { PeopleSort } from '@/shared/types/bff'

const OPTIONS: { value: PeopleSort; label: string; sub: string }[] = [
  { value: 'PRESENCE', label: 'Présence', sub: 'En ligne d’abord' },
  { value: 'RECENT', label: 'Récents', sub: 'Derniers contacts' },
  { value: 'ELO', label: 'Elo', sub: 'Du mieux classé au moins bien classé' },
  { value: 'ALPHA', label: 'Alphabétique', sub: 'De A à Z' },
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
              sub={option.sub}
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
