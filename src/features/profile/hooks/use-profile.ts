import { PSEUDONYM_PROBLEMS, pseudonymIssue, useActivity, useBadges, usePlayedTopics, type PseudonymIssue } from '@joutio/client/profile'
import { usePseudonymAvailability, useRewards } from '@joutio/client/me'
import type { ApiError } from '@joutio/client/core/types'
import { useEffect, useState } from 'react'
import { toast } from '@/design-system'
import { useSessionUserId } from '@/features/auth'
import { t } from '@/lib/i18n'

/** Collection de badges du joueur connecté. */
export const useMyBadges = () => useBadges(useSessionUserId())

/** Série et jours joués sur 365 jours. */
export const useMyActivity = () => useActivity(useSessionUserId())

/** Sujets joués (donut et maîtrise par sujet). */
export const useMyTopics = () => usePlayedTopics(useSessionUserId())

/** Catalogue des récompenses (styles d'avatar). */
export const useMyRewards = () => useRewards()

/** Refus d'un champ du profil : pseudonyme pris ou invalide, sinon l'erreur générique. Passé à `mutate(v, { onError })`. */
export function profileSaveError(error: unknown) {
  const type = (error as ApiError | undefined)?.type
  if (type === PSEUDONYM_PROBLEMS.taken) toast.error(t('settings.pseudonymTaken'))
  else if (type === PSEUDONYM_PROBLEMS.invalid) toast.error(pseudonymRules())
  else toast.error(t('settings.saveError'), { description: t('home.errorText') })
}

/** Règle du pseudonyme, dans la langue courante (lue à l'appel). */
export const pseudonymRules = () => t('settings.pseudonymRules')

/** État de saisie du pseudonyme : règles locales immédiates, unicité vérifiée par le BFF après une courte pause. */
export type PseudonymCheck = { state: 'unchanged' | 'checking' | 'available' | 'taken' } | { state: 'invalid'; issue: PseudonymIssue }

const PSEUDONYM_CHECK_DELAY_MS = 350

export function usePseudonymCheck(value: string, current: string | undefined): PseudonymCheck {
  const trimmed = value.trim()
  const unchanged = trimmed === (current ?? '')
  const issue = unchanged ? null : pseudonymIssue(trimmed)
  const [debounced, setDebounced] = useState(trimmed)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), PSEUDONYM_CHECK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [trimmed])
  const settled = debounced === trimmed
  // Saisie vide : la lib ne lit rien. La temporisation reste dans l'app.
  const query = usePseudonymAvailability(!unchanged && issue === null && settled ? debounced : '')
  if (unchanged) return { state: 'unchanged' }
  if (issue) return { state: 'invalid', issue }
  if (!settled || query.isPending || query.isFetching) return { state: 'checking' }
  if (query.data && !query.data.valid) return { state: 'invalid', issue: 'characters' }
  // Vérification indisponible : le serveur tranche à l'enregistrement.
  return query.data?.available === false ? { state: 'taken' } : { state: 'available' }
}
