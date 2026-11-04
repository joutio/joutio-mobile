import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { HomeView, UnreadCountView } from '@/shared/types/bff'

export const homeService = {
  /** Rails de l'Accueil : suivis, plus joués, nouveaux. */
  get: (): Promise<HomeView> => api.get<HomeView>(ENDPOINTS.home),

  /** Badge de la cloche. */
  unreadCount: (): Promise<UnreadCountView> => api.get<UnreadCountView>(ENDPOINTS.notifications.unreadCount),
}
