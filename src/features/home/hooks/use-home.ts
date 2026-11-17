import { useQuery } from '@tanstack/react-query'
import { homeQuery, unreadCountQuery } from '@joutio/client/query'
import { api } from '@/lib/api'

/** Rails de l'Accueil. */
export function useHome() {
  return useQuery({ ...homeQuery(api), staleTime: 60_000 })
}

/** Notifications non lues, pour le badge de la cloche. */
export function useUnreadCount() {
  return useQuery({ ...unreadCountQuery(api), staleTime: 30_000 })
}
