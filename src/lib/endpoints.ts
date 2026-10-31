import { config } from "./config";

/**
 * Endpoints de la surface BFF (`/api/**`) et de la surface d'authentification native de
 * `joutio-identity`.
 *
 * <p>L'auth mobile est préfixée `/api/auth/mobile/**` et retourne directement les tokens.
 * Seul le refresh utilise le endpoint OIDC standard `/oauth2/token`.</p>
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
  me: "/api/me",
  suggestions: "/api/suggestions",
  onboarding: {
    complete: "/api/me/onboarding/complete",
    recommendations: "/api/me/onboarding/recommendations",
    interests: "/api/me/interests",
  },
  deletionCode: "/api/me/deletion-code",
  notificationPreferences: {
    list: "/api/notification-preferences",
    item: (category: string) => `/api/notification-preferences/${category}`,
  },
  rewards: "/api/me/rewards",
  home: "/api/home",
  topics: {
    list: "/api/topics",
    facets: "/api/topics/facets",
    overview: (topicId: string) => `/api/topics/${topicId}/overview`,
    leaderboard: (topicId: string) =>
      `/api/topics/${topicId}/leaderboard`,
    follow: (topicId: string) => `/api/topics/${topicId}/follow`,
    create: "/api/topics",
    imageUrl: (topicId: string) => `/api/topics/${topicId}/image-url`,
    name: (topicId: string) => `/api/topics/${topicId}/name`,
    category: (topicId: string) => `/api/topics/${topicId}/category`,
    publish: (topicId: string) => `/api/topics/${topicId}/publish`,
    questions: (topicId: string) => `/api/topics/${topicId}/questions`,
  },
  questions: {
    text: (id: string) => `/api/questions/${id}/text`,
    answers: (id: string) => `/api/questions/${id}/answers`,
    correctAnswer: (id: string) => `/api/questions/${id}/correct-answer`,
    imageUrl: (id: string) => `/api/questions/${id}/image-url`,
    approve: (id: string) => `/api/questions/${id}/approve`,
    reject: (id: string) => `/api/questions/${id}/reject`,
    reports: (id: string) => `/api/questions/${id}/reports`,
    resolveAll: (id: string) => `/api/questions/${id}/reports/resolve`,
  },
  media: { upload: "/api/media" },
  profiles: {
    detail: (userId: string) => `/api/profiles/${userId}`,
    following: (userId: string) => `/api/profiles/${userId}/following`,
    followers: (userId: string) => `/api/profiles/${userId}/followers`,
    follow: (userId: string) => `/api/profiles/${userId}/follow`,
    headToHead: (userId: string) => `/api/profiles/${userId}/head-to-head`,
    reports: (userId: string) => `/api/profiles/${userId}/reports`,
    badges: (userId: string) => `/api/profiles/${userId}/badges`,
    activity: (userId: string) => `/api/profiles/${userId}/activity`,
    titles: (userId: string) => `/api/profiles/${userId}/titles`,
    title: (userId: string) => `/api/profiles/${userId}/title`,
    games: (userId: string) => `/api/profiles/${userId}/games`,
  },
  challenges: {
    create: "/api/challenges",
    mine: "/api/challenges/mine",
    detail: (challengeId: string) => `/api/challenges/${challengeId}`,
    accept: (challengeId: string) => `/api/challenges/${challengeId}/accept`,
    decline: (challengeId: string) => `/api/challenges/${challengeId}/decline`,
    cancel: (challengeId: string) => `/api/challenges/${challengeId}/cancel`,
  },
  notifications: {
    list: "/api/notifications",
    unreadCount: "/api/notifications/unread-count",
    read: (notificationId: string) =>
      `/api/notifications/${notificationId}/read`,
    readAll: "/api/notifications/read-all",
  },
  rooms: {
    create: "/api/rooms",
    bot: "/api/rooms/bot",
    mine: "/api/rooms/mine",
    detail: (roomId: string) => `/api/rooms/${roomId}`,
    join: (roomId: string) => `/api/rooms/${roomId}/join`,
    leave: (roomId: string) => `/api/rooms/${roomId}/leave`,
    cancel: (roomId: string) => `/api/rooms/${roomId}/cancel`,
    wizz: (roomId: string) => `/api/rooms/${roomId}/wizz`,
    notifications: (roomId: string) =>
      `/api/rooms/${roomId}/notifications`,
  },
  games: {
    active: "/api/games?active=true",
    answer: (gameId: string) => `/api/games/${gameId}/answer`,
    abandon: (gameId: string) => `/api/games/${gameId}/abandon`,
    cancel: (gameId: string) => `/api/games/${gameId}/cancel`,
    result: (gameId: string) => `/api/games/${gameId}/result`,
    notifications: (gameId: string) =>
      `/api/games/${gameId}/notifications`,
  },
  matchmaking: {
    tickets: "/api/matchmaking/tickets",
    ticket: (ticketId: string) =>
      `/api/matchmaking/tickets/${ticketId}`,
    cancel: (ticketId: string) =>
      `/api/matchmaking/tickets/${ticketId}/cancel`,
    notifications: (ticketId: string) =>
      `/api/matchmaking/tickets/${ticketId}/notifications`,
  },
  questionReports: (questionId: string) =>
    `/api/questions/${questionId}/reports`,
  profileSettings: {
    avatarOptions: (userId: string) => `/api/profiles/${userId}/avatar-options`,
    pseudonym: (userId: string) => `/api/profiles/${userId}/pseudonym`,
    bio: (userId: string) => `/api/profiles/${userId}/bio`,
    country: (userId: string) => `/api/profiles/${userId}/country`,
    language: (userId: string) => `/api/profiles/${userId}/language`,
  },
} as const;
