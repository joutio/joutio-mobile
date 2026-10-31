import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  MeView,
  NotificationPreferenceView,
  SuggestionView,
  TopicCardView,
} from "@/shared/types/bff";

export const meService = {
  get: (): Promise<MeView> => api.get<MeView>(ENDPOINTS.me),

  suggestions: (q: string): Promise<SuggestionView[]> =>
    api.get<SuggestionView[]>(ENDPOINTS.suggestions, {
      params: { q, limit: 10 },
    }),

  saveInterests: (interests: string[]): Promise<void> =>
    api.put<void>(ENDPOINTS.onboarding.interests, { interests }),

  recommendations: (interests: string[]): Promise<TopicCardView[]> =>
    api.get<TopicCardView[]>(ENDPOINTS.onboarding.recommendations, {
      params: { interests: interests.join(",") },
    }),

  completeOnboarding: (): Promise<MeView> =>
    api.post<MeView>(ENDPOINTS.onboarding.complete),

  requestDeletionCode: (): Promise<void> =>
    api.post<void>(ENDPOINTS.deletionCode),

  deleteAccount: (code: string): Promise<void> =>
    api.delete<void>(ENDPOINTS.me, { body: { code } }),

  notificationPreferences: (): Promise<NotificationPreferenceView[]> =>
    api.get<NotificationPreferenceView[]>(ENDPOINTS.notificationPreferences.list),

  updateNotificationPreference: (
    category: string,
    enabled: boolean,
  ): Promise<void> =>
    api.put<void>(ENDPOINTS.notificationPreferences.item(category), { enabled }),
};
