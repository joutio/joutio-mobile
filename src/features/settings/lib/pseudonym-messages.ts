import { pseudonymRules, type PseudonymCheck } from '@/features/profile/hooks/use-profile'
import { t } from '@/lib/i18n'

const ISSUE_MESSAGES = () => ({
  tooShort: t('settings.pseudonymTooShort'),
  tooLong: t('settings.pseudonymTooLong'),
  firstLetter: t('settings.pseudonymFirstLetter'),
  characters: t('settings.pseudonymCharacters'),
} as const)

export function pseudonymError(check: PseudonymCheck): string | undefined {
  if (check.state === 'invalid') return ISSUE_MESSAGES()[check.issue]
  if (check.state === 'taken') return t('settings.pseudonymTaken')
  return undefined
}

export function pseudonymHint(check: PseudonymCheck): string {
  if (check.state === 'checking') return t('settings.pseudonymChecking')
  if (check.state === 'available') return t('settings.pseudonymAvailable')
  return pseudonymRules()
}
