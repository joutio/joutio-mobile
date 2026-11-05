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
  home: '/api/home',
  topics: {
    list: '/api/topics',
    facets: '/api/topics/facets',
    overview: (topicId: string) => `/api/topics/${topicId}/overview`,
    leaderboard: (topicId: string) => `/api/topics/${topicId}/leaderboard`,
    follow: (topicId: string) => `/api/topics/${topicId}/follow`,
  },
  profiles: {
    games: (userId: string) => `/api/profiles/${userId}/games`,
    titles: (userId: string) => `/api/profiles/${userId}/titles`,
    title: (userId: string) => `/api/profiles/${userId}/title`,
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
