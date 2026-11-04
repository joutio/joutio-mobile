import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { onboardingService } from '../lib/onboarding-service'

export function useSaveInterests() {
  return useMutation({ mutationFn: (interests: readonly string[]) => onboardingService.saveInterests(interests) })
}

export function useRecommendations(interests: readonly string[]) {
  return useQuery({
    queryKey: queryKeys.onboarding.recommendations(interests),
    queryFn: () => onboardingService.recommendations(interests),
    enabled: interests.length > 0,
  })
}

/** Termine l'onboarding : `me` passe à `onboardingCompleted`, la navigation bascule sur l'app. */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: onboardingService.complete,
    onSuccess: (me) => queryClient.setQueryData(queryKeys.me(), me),
  })
}
