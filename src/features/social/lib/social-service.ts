import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { HeadToHeadView, PlayerProfileView } from '@joutio/client-domain/api-types'

/** Fiche joueur, suivi et face-à-face (`/api/profiles/{id}`). */
export const socialService = {
  profile: (userId: string) => api.get<PlayerProfileView>(ENDPOINTS.profiles.profile(userId)),
  follow: (userId: string, follow: boolean) =>
    follow ? api.put<void>(ENDPOINTS.profiles.follow(userId)) : api.delete<void>(ENDPOINTS.profiles.follow(userId)),
  headToHead: (userId: string, against: string) => api.get<HeadToHeadView>(ENDPOINTS.profiles.headToHead(userId), { params: { against } }),
}
