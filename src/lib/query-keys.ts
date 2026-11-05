/** Clés de requête hiérarchiques (cache React Query). */
export const queryKeys = {
  me: () => ['me'] as const,
  serverTime: () => ['server-time'] as const,
  home: () => ['home'] as const,
  topics: {
    list: (filters: object) => ['topics', 'list', filters] as const,
    facets: (query: string) => ['topics', 'facets', query] as const,
  },
  topic: {
    all: (topicId: string) => ['topic', topicId] as const,
    overview: (topicId: string) => ['topic', topicId, 'overview'] as const,
    leaderboard: (topicId: string) => ['topic', topicId, 'leaderboard'] as const,
    leaderboardPage: (topicId: string, filters: object) => ['topic', topicId, 'leaderboard-page', filters] as const,
    games: (topicId: string, userId: string) => ['topic', topicId, 'games', userId] as const,
  },
  profiles: {
    titles: (userId: string) => ['profiles', userId, 'titles'] as const,
    games: (userId: string, filters: object) => ['profiles', userId, 'games', filters] as const,
    profile: (userId: string) => ['profiles', userId, 'profile'] as const,
    badges: (userId: string) => ['profiles', userId, 'badges'] as const,
    activity: (userId: string) => ['profiles', userId, 'activity'] as const,
    topics: (userId: string) => ['profiles', userId, 'topics'] as const,
  },
  rewards: () => ['me', 'rewards'] as const,
  notificationPreferences: () => ['notification-preferences'] as const,
  notifications: {
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  onboarding: {
    recommendations: (interests: readonly string[]) => ['onboarding', 'recommendations', interests] as const,
  },
} as const
