import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type {
  ActivityView,
  BadgeCollectionView,
  Language,
  NotificationCategory,
  NotificationPreferenceView,
  RewardsView,
  TopicStatView,
  PseudonymAvailability,
} from '@joutio/client-domain/api-types'

/** Profil du joueur connecté : progression (badges, série, sujets, récompenses) et réglages (`/api/profiles/{id}/…`). */
export const profileService = {
  badges: (userId: string) => api.get<BadgeCollectionView>(ENDPOINTS.profiles.badges(userId)),
  activity: (userId: string) => api.get<ActivityView>(ENDPOINTS.profiles.activity(userId)),
  topics: (userId: string) => api.get<TopicStatView[]>(ENDPOINTS.profiles.topics(userId)),
  rewards: () => api.get<RewardsView>(ENDPOINTS.meRewards),

  pseudonym: (userId: string, pseudonym: string) => api.put<void>(ENDPOINTS.profiles.pseudonym(userId), { pseudonym }),
  pseudonymAvailability: (value: string) => api.get<PseudonymAvailability>(ENDPOINTS.profiles.pseudonymAvailability, { params: { value } }),
  bio: (userId: string, bio: string) => api.put<void>(ENDPOINTS.profiles.bio(userId), { bio: bio || null }),
  country: (userId: string, country: string | null) => api.put<void>(ENDPOINTS.profiles.country(userId), { country }),
  banner: (userId: string, bannerUrl: string | null) => api.put<void>(ENDPOINTS.profiles.banner(userId), { bannerUrl }),
  language: (userId: string, language: Language) => api.put<void>(ENDPOINTS.profiles.language(userId), { language }),
  avatarOptions: (userId: string, avatarOptions: string | null) => api.put<void>(ENDPOINTS.profiles.avatarOptions(userId), { avatarOptions }),
  interests: (interests: readonly string[]) => api.put<void>(ENDPOINTS.meInterests, { interests }),

  notificationPreferences: () => api.get<NotificationPreferenceView[]>(ENDPOINTS.notificationPreferences.list),
  setNotificationPreference: (category: NotificationCategory, enabled: boolean) =>
    api.put<void>(ENDPOINTS.notificationPreferences.update(category), { enabled }),

  requestDeletionCode: () => api.post<void>(ENDPOINTS.meDeletionCode),
  deleteAccount: (code: string) => api.delete<void>(ENDPOINTS.me, { body: { code } }),
}
