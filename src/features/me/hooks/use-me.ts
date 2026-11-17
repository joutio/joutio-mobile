import { useQuery } from '@tanstack/react-query'
import { meQuery } from '@joutio/client/query'
import { api } from '@/lib/api'

/** Joueur courant. `enabled` : seulement une fois la session authentifiée. */
export function useMe(enabled = true) {
  return useQuery({ ...meQuery(api), staleTime: 30_000, enabled })
}
