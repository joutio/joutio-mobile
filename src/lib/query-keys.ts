/** Clés de requête hiérarchiques (cache React Query). */
export const queryKeys = {
  me: () => ['me'] as const,
  pseudonymAvailability: (key: string) => ['me', 'pseudonym-availability', key] as const,
  serverTime: () => ['server-time'] as const,
  /** Recherche globale. */
  suggestions: (term: string) => ['suggestions', term] as const,
  home: () => ['home'] as const,
  topics: {
    all: () => ['topics'] as const,
    /** Toutes les pages du catalogue, quel que soit le filtre. */
    lists: () => ['topics', 'list'] as const,
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
    /** Tout ce qui concerne un joueur (profil, titres, badges, parties…). */
    all: (userId: string) => ['profiles', userId] as const,
    titles: (userId: string) => ['profiles', userId, 'titles'] as const,
    games: (userId: string, filters: object) => ['profiles', userId, 'games', filters] as const,
    profile: (userId: string) => ['profiles', userId, 'profile'] as const,
    badges: (userId: string) => ['profiles', userId, 'badges'] as const,
    activity: (userId: string) => ['profiles', userId, 'activity'] as const,
    topics: (userId: string) => ['profiles', userId, 'topics'] as const,
    headToHead: (userId: string, against: string) => ['profiles', userId, 'head-to-head', against] as const,
  },
  authoring: {
    topics: () => ['authoring', 'topics'] as const,
    created: () => ['authoring', 'created'] as const,
    /** Sujets publiés au nom proche, pour l'avertissement de doublon de « Nouveau sujet ». */
    named: (query: string) => ['authoring', 'named', query] as const,
    questions: (topicId: string) => ['authoring', 'questions', topicId] as const,
    reports: (topicId: string) => ['authoring', 'reports', topicId] as const,
    todo: () => ['authoring', 'todo'] as const,
    workshop: (topicId: string) => ['authoring', topicId, 'workshop'] as const,
    team: (topicId: string) => ['authoring', topicId, 'team'] as const,
    /** Détails de signalement d'un sujet (préfixe). */
    reportDetails: (topicId: string) => ['authoring', topicId, 'report-detail'] as const,
  },
  /** Abonnements / abonnés d'un joueur, par recherche et tri. */
  contacts: {
    all: () => ['contacts'] as const,
    list: (userId: string, direction: string, query: string, sort: string) => ['contacts', userId, direction, query, sort] as const,
  },
  rewards: () => ['me', 'rewards'] as const,
  challenges: () => ['challenges', 'mine'] as const,
  /** Salons du joueur (`/api/rooms/mine`) : une seule requête pour Défis, la pastille et la reprise de partie. */
  rooms: () => ['rooms', 'mine'] as const,
  /** Un salon (`/api/rooms/{id}`). */
  room: (roomId: string) => ['rooms', 'room', roomId] as const,
  games: {
    /** Toutes les listes de parties en cours (préfixe). */
    activeAll: () => ['games', 'active'] as const,
    /** Parties en cours du joueur (`/api/games?active=true`). */
    active: (userId: string) => ['games', 'active', userId] as const,
    result: (gameId: string) => ['games', gameId, 'result'] as const,
    notifications: (gameId: string) => ['games', gameId, 'notifications'] as const,
    streakUnlock: (gameId: string) => ['games', gameId, 'streak-unlock'] as const,
  },
  notificationPreferences: () => ['notification-preferences'] as const,
  notifications: {
    all: () => ['notifications'] as const,
    list: () => ['notifications', 'list'] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
  },
  onboarding: {
    recommendations: (interests: readonly string[]) => ['onboarding', 'recommendations', interests] as const,
  },
} as const
