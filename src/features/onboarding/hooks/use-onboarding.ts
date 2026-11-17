import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { optimisticUpdate, queryKeys, recommendationsQuery } from '@joutio/client/query'
import type { MeView } from '@joutio/client/api-types'
import { onboardingService } from '../lib/onboarding-service'
import { api } from '@/lib/api'

export function useSaveInterests() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (interests: readonly string[]) => onboardingService.saveInterests(interests),
    onMutate: (interests) =>
      optimisticUpdate(client, [queryKeys.me()], () => client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, interests: [...interests] } : me))),
    onError: (_error, _variables, context) => context?.rollback(),
  })
}

export function useRecommendations(interests: readonly string[]) {
  return useQuery({
    ...recommendationsQuery(api, interests),
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
