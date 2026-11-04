/** Contrats de la surface BFF (`services/joutio-bff/AGENTS.md` § 3), limités à ce que l'app consomme. */

export type Language = 'fr' | 'en'
export type TopicNames = Record<string, string>
export type TopicStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/** `GET /api/me`, champs lus par l'app. */
export interface MeView {
  userId: string
  email: string
  pseudonym: string
  language: Language
  /** Codes d'univers ordonnés (premier = principal), 3 au plus. */
  interests: string[]
  onboardingCompleted: boolean
  premium: boolean
  progression: ProgressionView | null
  stats: DuelStatsView | null
}

export interface ProgressionView {
  /** Elo global. */
  rating: number
  peakRating: number
  ratedGames: number
  /** Moins de parties classées que le seuil : le rang n'est pas encore affiché comme acquis. */
  provisional: boolean
}

export interface DuelStatsView {
  played: number
  wins: number
  currentWinStreak: number
  bestWinStreak: number
}

export interface TopicCardView {
  topicId: string
  names: TopicNames
  description: string | null
  category: string | null
  categoryLabel: string | null
  imageUrl: string | null
  bannerUrl: string | null
  followersCount: number
  questionsCount: number
  followed: boolean
  status: TopicStatus
}

/** `GET /api/home` : rails de l'Accueil. */
export interface HomeView {
  followedTopics: TopicCardView[]
  /** Sujets les plus joués : « Top 10 du moment ». */
  trendingTopics: TopicCardView[]
  newTopics: TopicCardView[]
  /** Sélection « Pour toi » (centres d'intérêt) — pas encore placée par la spec de l'Accueil. */
  recommendedTopics: TopicCardView[]
}

/** `GET /api/notifications/unread-count`. */
export interface UnreadCountView {
  count: number
}

/** Page Spring du BFF (`PageResponse`). */
export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

/** Tri du catalogue (`TopicSort` de `joutio-theme-domain`). */
export type TopicSort = 'POPULAR' | 'MOST_PLAYED' | 'ALPHA' | 'RECENT'

/** `GET /api/topics/facets` : nombre de sujets par univers pour une recherche. */
export interface TopicFacetsView {
  total: number
  categories: { category: string; label: string; count: number }[]
}
