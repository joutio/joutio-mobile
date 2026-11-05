import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { HeadToHeadView, PlayerProfileView, TopicStatView } from '@/shared/types/bff'

/** Fiche joueur, suivi et sujets joués (`/api/profiles/{id}`). */
export const socialService = {
  profile: (userId: string) => api.get<PlayerProfileView>(ENDPOINTS.profiles.profile(userId)),
  follow: (userId: string, follow: boolean) =>
    follow ? api.put<void>(ENDPOINTS.profiles.follow(userId)) : api.delete<void>(ENDPOINTS.profiles.follow(userId)),
  topics: (userId: string) => api.get<TopicStatView[]>(ENDPOINTS.profiles.topics(userId)),
  headToHead: (userId: string, against: string) => api.get<HeadToHeadView>(ENDPOINTS.profiles.headToHead(userId), { params: { against } }),
}
