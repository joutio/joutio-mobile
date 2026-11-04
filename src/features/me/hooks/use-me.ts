import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { meService } from '../lib/me-service'

/** Joueur courant. `enabled` : seulement une fois la session authentifiée. */
export function useMe(enabled = true) {
  return useQuery({ queryKey: queryKeys.me(), queryFn: meService.get, staleTime: 30_000, enabled })
}
