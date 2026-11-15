import type { MeView } from '@joutio/client/api-types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { accountService } from '../lib/account-service'

/** Date de naissance privée (15 ans minimum) : `me` est mis à jour au succès, la date n'est plus exigée. */
export function useSetBirthDate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (birthDate: string) => accountService.setBirthDate(birthDate),
    onSuccess: (_result, birthDate) => {
      // Mise à jour sur place, sans relecture (règle des mutations, AGENTS.md § 5).
      client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, birthDate, birthDateRequired: false } : me))
    },
  })
}

/** Acceptation de la version en vigueur des CGU : `me` est mis à jour sur place au succès, l'écran se ferme. */
export function useAcceptTerms() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (version: string) => accountService.acceptTerms(version),
    onSuccess: () => {
      client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, termsUpToDate: true } : me))
    },
  })
}
