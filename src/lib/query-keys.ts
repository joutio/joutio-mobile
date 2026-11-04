/** Clés de requête hiérarchiques (cache React Query). */
export const queryKeys = {
  me: () => ['me'] as const,
  onboarding: {
    recommendations: (interests: readonly string[]) => ['onboarding', 'recommendations', interests] as const,
  },
} as const
