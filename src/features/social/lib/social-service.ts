import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'

/** Fiche joueur, suivi et face-à-face (`/api/profiles/{id}`). */
export const socialService = {
  follow: (userId: string, follow: boolean) =>
    follow ? api.put<void>(ENDPOINTS.profiles.follow(userId)) : api.delete<void>(ENDPOINTS.profiles.follow(userId)),
}
