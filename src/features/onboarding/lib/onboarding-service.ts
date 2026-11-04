import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { MeView, TopicCardView } from '@/shared/types/bff'

export const onboardingService = {
  /** 0 à 3 codes d'univers, ordre conservé (premier = principal). */
  saveInterests: (interests: readonly string[]): Promise<void> => api.put<void>(ENDPOINTS.onboarding.interests, { interests }),

  /** Sujets publiés et jouables pour les univers choisis, avant persistance. */
  recommendations: (interests: readonly string[]): Promise<TopicCardView[]> =>
    api.get<TopicCardView[]>(ENDPOINTS.onboarding.recommendations, { params: { interests: interests.join(',') } }),

  /** Fin ou saut de l'onboarding ; idempotent. */
  complete: (): Promise<MeView> => api.post<MeView>(ENDPOINTS.onboarding.complete),
}
