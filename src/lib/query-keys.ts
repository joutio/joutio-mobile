/** Clés de requête hiérarchiques (cache React Query). */
export const queryKeys = {
  me: () => ['me'] as const,
  home: () => ['home'] as const,
  topics: {
    list: (filters: object) => ['topics', 'list', filters] as const,
    facets: (query: string) => ['topics', 'facets', query] as const,
  },
  notifications: {
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  onboarding: {
    recommendations: (interests: readonly string[]) => ['onboarding', 'recommendations', interests] as const,
  },
} as const
