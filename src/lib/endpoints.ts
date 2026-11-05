import { config } from './config'

/**
 * Surface BFF (`/api/**`, relative à `config.apiUrl`) et auth native de `joutio-identity` (absolue).
 * L'auth mobile retourne directement les tokens ; seul le refresh passe par `/oauth2/token`.
 */
export const ENDPOINTS = {
  auth: {
    requestLoginCode: `${config.identityUrl}/api/auth/mobile/request-login-code`,
    loginWithCode: `${config.identityUrl}/api/auth/mobile/login-with-code`,
    loginWithGoogle: `${config.identityUrl}/api/auth/mobile/login-with-google`,
    loginWithFacebook: `${config.identityUrl}/api/auth/mobile/login-with-facebook`,
    logout: `${config.identityUrl}/api/auth/mobile/logout`,
    token: `${config.identityUrl}/oauth2/token`,
  },
  me: '/api/me',
  meRewards: '/api/me/rewards',
  media: '/api/media',
  meInterests: '/api/me/interests',
  meDeletionCode: '/api/me/deletion-code',
  notificationPreferences: {
    list: '/api/notification-preferences',
    update: (category: string) => `/api/notification-preferences/${category}`,
  },
  home: '/api/home',
  topics: {
    list: '/api/topics',
    facets: '/api/topics/facets',
    overview: (topicId: string) => `/api/topics/${topicId}/overview`,
    leaderboard: (topicId: string) => `/api/topics/${topicId}/leaderboard`,
    follow: (topicId: string) => `/api/topics/${topicId}/follow`,
  },
  rooms: {
    create: '/api/rooms',
    mine: '/api/rooms/mine',
    bot: '/api/rooms/bot',
    get: (roomId: string) => `/api/rooms/${roomId}`,
    join: (roomId: string) => `/api/rooms/${roomId}/join`,
    leave: (roomId: string) => `/api/rooms/${roomId}/leave`,
    cancel: (roomId: string) => `/api/rooms/${roomId}/cancel`,
    wizz: (roomId: string) => `/api/rooms/${roomId}/wizz`,
    notifications: (roomId: string) => `/api/rooms/${roomId}/notifications`,
    topic: (roomId: string) => `/topic/rooms/${roomId}`,
  },
  matchmaking: {
    tickets: '/api/matchmaking/tickets',
    cancel: (ticketId: string) => `/api/matchmaking/tickets/${ticketId}/cancel`,
    notifications: (ticketId: string) => `/api/matchmaking/tickets/${ticketId}/notifications`,
    topic: (ticketId: string) => `/topic/matchmaking/tickets/${ticketId}`,
  },
  challenges: {
    create: '/api/challenges',
    mine: '/api/challenges/mine',
    get: (challengeId: string) => `/api/challenges/${challengeId}`,
    accept: (challengeId: string) => `/api/challenges/${challengeId}/accept`,
    decline: (challengeId: string) => `/api/challenges/${challengeId}/decline`,
    cancel: (challengeId: string) => `/api/challenges/${challengeId}/cancel`,
  },
  reports: {
    player: (userId: string) => `/api/profiles/${userId}/reports`,
    question: (questionId: string) => `/api/questions/${questionId}/reports`,
  },
  games: {
    answer: (gameId: string) => `/api/games/${gameId}/answer`,
    abandon: (gameId: string) => `/api/games/${gameId}/abandon`,
    result: (gameId: string) => `/api/games/${gameId}/result`,
    notifications: (gameId: string) => `/api/games/${gameId}/notifications`,
    topic: (gameId: string) => `/topic/games/${gameId}`,
  },
  profiles: {
    profile: (userId: string) => `/api/profiles/${userId}`,
    follow: (userId: string) => `/api/profiles/${userId}/follow`,
    following: (userId: string) => `/api/profiles/${userId}/following`,
    followers: (userId: string) => `/api/profiles/${userId}/followers`,
    autoTrain: (userId: string) => `/api/profiles/${userId}/auto-train`,
    games: (userId: string) => `/api/profiles/${userId}/games`,
    topics: (userId: string) => `/api/profiles/${userId}/topics`,
    headToHead: (userId: string) => `/api/profiles/${userId}/head-to-head`,
    titles: (userId: string) => `/api/profiles/${userId}/titles`,
    title: (userId: string) => `/api/profiles/${userId}/title`,
    badges: (userId: string) => `/api/profiles/${userId}/badges`,
    activity: (userId: string) => `/api/profiles/${userId}/activity`,
    pseudonym: (userId: string) => `/api/profiles/${userId}/pseudonym`,
    bio: (userId: string) => `/api/profiles/${userId}/bio`,
    country: (userId: string) => `/api/profiles/${userId}/country`,
    banner: (userId: string) => `/api/profiles/${userId}/banner`,
    language: (userId: string) => `/api/profiles/${userId}/language`,
    avatarOptions: (userId: string) => `/api/profiles/${userId}/avatar-options`,
  },
  notifications: {
    unreadCount: '/api/notifications/unread-count',
  },
  onboarding: {
    interests: '/api/me/interests',
    recommendations: '/api/me/onboarding/recommendations',
    complete: '/api/me/onboarding/complete',
  },
} as const
