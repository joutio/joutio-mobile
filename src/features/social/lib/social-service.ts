import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'

/** Fiche joueur, suivi, blocage et face-à-face (`/api/profiles/{id}`). */
export const socialService = {
  follow: (userId: string, follow: boolean) =>
    follow ? api.put<void>(ENDPOINTS.profiles.follow(userId)) : api.delete<void>(ENDPOINTS.profiles.follow(userId)),
  /** Effet symétrique côté serveur : abonnements et défis en attente retirés des deux côtés. */
  block: (userId: string, block: boolean) => (block ? api.put<void>(ENDPOINTS.profiles.block(userId)) : api.delete<void>(ENDPOINTS.profiles.block(userId))),
}
