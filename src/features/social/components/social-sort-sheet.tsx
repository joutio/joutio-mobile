import { ListGroup, ListRow, MobileSheet, RadioGroup } from '@/design-system'
import type { PeopleSort } from '@joutio/client/api-types'
import { t, useT } from '@/lib/i18n'

/** Libellés seuls, comme le lab (`SOCIAL_SORTS()`). */
export const SOCIAL_SORTS = (): { value: PeopleSort; label: string }[] => ([
  { value: 'PRESENCE', label: t('social.sortPresence') },
  { value: 'RECENT', label: t('social.sortRecent') },
  { value: 'ELO', label: t('social.sortElo') },
  { value: 'ALPHA', label: t('social.sortAlpha') },
])

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
  const t = useT()
  return (
    <MobileSheet open={open} onClose={onClose} title={t('topics.sortBy')}>
      <ListGroup>
        <RadioGroup label={t('topics.sortBy')}>
          {SOCIAL_SORTS().map((option, index) => (
            <ListRow
              key={option.value}
              label={option.label}
              control="radio"
              on={value === option.value}
              last={index === SOCIAL_SORTS().length - 1}
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
