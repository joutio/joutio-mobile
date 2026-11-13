import { PSEUDONYM_RULES, type PseudonymCheck } from '@/features/profile/hooks/use-profile'

const ISSUE_MESSAGES = {
  tooShort: 'Au moins 3 caractères.',
  tooLong: '20 caractères au plus.',
  firstLetter: 'Commence par une lettre sans accent.',
  characters: 'Uniquement des lettres sans accent, des chiffres ou _.',
} as const

export function pseudonymError(check: PseudonymCheck): string | undefined {
  if (check.state === 'invalid') return ISSUE_MESSAGES[check.issue]
  if (check.state === 'taken') return 'Ce pseudonyme est déjà pris.'
  return undefined
}

export function pseudonymHint(check: PseudonymCheck): string {
  if (check.state === 'checking') return 'Vérification de la disponibilité…'
  if (check.state === 'available') return 'Disponible.'
  return PSEUDONYM_RULES
}
