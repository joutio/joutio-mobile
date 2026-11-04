import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { homeService } from '../lib/home-service'

/** Rails de l'Accueil. */
export function useHome() {
  return useQuery({ queryKey: queryKeys.home(), queryFn: homeService.get, staleTime: 60_000 })
}

/** Notifications non lues, pour le badge de la cloche. */
export function useUnreadCount() {
  return useQuery({ queryKey: queryKeys.notifications.unreadCount(), queryFn: homeService.unreadCount, staleTime: 30_000 })
}
