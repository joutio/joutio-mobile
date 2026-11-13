import type { MeView } from '@joutio/client-domain/api-types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { accountService } from '../lib/account-service'

export const REFERRAL_KEY = ['me', 'referral'] as const

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

/** Parrainage du joueur courant : code, filleuls, progression du badge Recruteur, parrain éventuel. */
export function useReferral(enabled = true) {
  return useQuery({ queryKey: REFERRAL_KEY, queryFn: accountService.referral, enabled, staleTime: 5 * 60_000 })
}

/** Applique un code de parrainage ; le parrain apparaît à la prochaine lecture de la page Inviter. */
export function useApplyReferral() {
  return useMutation({ mutationFn: (code: string) => accountService.applyReferral(code) })
}
