
import type {
  ProfileGamesParams,
  TopicFacetsParams,
  TopicLeaderboardParams,
  TopicListParams,
} from "@/shared/types/bff";

/** Fabrique de clés de requête hiérarchiques (cache React Query). */
export const queryKeys = {
  me: () => ["me"] as const,
  suggestions: (q: string) => ["suggestions", q] as const,
  recommendations: (interests: string[]) =>
    ["recommendations", interests] as const,
  notificationPreferences: () => ["notification-preferences"] as const,
  rewards: () => ["rewards"] as const,
  home: () => ["home"] as const,
  topics: {
    all: ["topics"] as const,
    list: (params: TopicListParams) => ["topics", "list", params] as const,
    facets: (params: TopicFacetsParams) =>
      ["topics", "facets", params] as const,
    overview: (topicId: string) => ["topics", "overview", topicId] as const,
    leaderboard: (topicId: string, params: TopicLeaderboardParams) =>
      ["topics", "leaderboard", topicId, params] as const,
  },
  profiles: {
    all: ["profiles"] as const,
    detail: (userId: string) => ["profiles", "detail", userId] as const,
    people: (userId: string, direction: string, q: string) =>
      ["profiles", "people", userId, direction, q] as const,
    headToHead: (userId: string, against: string) =>
      ["profiles", "head-to-head", userId, against] as const,
    badges: (userId: string) => ["profiles", "badges", userId] as const,
    activity: (userId: string) => ["profiles", "activity", userId] as const,
    titles: (userId: string) => ["profiles", "titles", userId] as const,
    games: (userId: string, params: ProfileGamesParams) =>
      ["profiles", "games", userId, params] as const,
  },
  challenges: {
    mine: () => ["challenges", "mine"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    list: () => ["notifications", "list"] as const,
    unreadCount: () => ["notifications", "unread-count"] as const,
  },
  rooms: {
    all: ["rooms"] as const,
    mine: () => ["rooms", "mine"] as const,
    detail: (roomId: string) => ["rooms", "detail", roomId] as const,
    notifications: (roomId: string) =>
      ["rooms", "notifications", roomId] as const,
  },
  games: {
    all: ["games"] as const,
    active: () => ["games", "active"] as const,
    result: (gameId: string) => ["games", "result", gameId] as const,
    notifications: (gameId: string) =>
      ["games", "notifications", gameId] as const,
  },
  matchmaking: {
    ticket: (ticketId: string) =>
      ["matchmaking", "ticket", ticketId] as const,
  },
} as const;
