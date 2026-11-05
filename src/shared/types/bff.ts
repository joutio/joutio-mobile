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
  /**
   * Recherche expirée sans adversaire : entraînement automatique contre le bot. Absent tant que le BFF n'expose pas
   * encore le champ : `true` par défaut.
   */
  autoTrainOnTimeout?: boolean
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

/** Palier de maîtrise d'un sujet (`MasteryTier` de `joutio-profile-domain`), mêmes codes que les tokens `tier`. */
export type MasteryTier = 'FER' | 'BRONZE' | 'ARGENT' | 'OR' | 'PLATINE' | 'EMERAUDE' | 'DIAMANT'

/** `GET /api/topics/{id}/overview` : en-tête et onglet Progression de la Fiche sujet. */
export interface TopicOverviewView {
  topic: TopicCardView
  /** Titres thématiques par langue puis palier (`{ fr: { OR: "Connétable" } }`). Absent : repli « palier · sujet ». */
  titles: Record<string, Record<string, string>> | null
  myRank: number | null
  myProgress: TopicProgressView | null
  canManage: boolean
}

export interface TopicProgressView {
  xp: number
  /** Parties humaines terminées dans le sujet (condition du premier titre). */
  games: number
  tier: MasteryTier
  tierProgressPercent: number
  tierRemainingXp: number
  nextTier: MasteryTier | null
  completedQuestions: number
  totalQuestions: number
  completionPercent: number
}

export type LeaderboardPeriod = 'ALL_TIME' | 'MONTHLY'
export type LeaderboardScope = 'WORLD' | 'FOLLOWING' | 'COUNTRY'

/** `GET /api/topics/{id}/leaderboard`. */
export interface TopicLeaderboardView {
  entries: PageResponse<LeaderboardEntryView>
  me: LeaderboardEntryView | null
}

export interface LeaderboardEntryView {
  rank: number
  userId: string
  pseudonym: string
  avatarOptions: string | null
  country: string | null
  /** Elo global (bordure d'avatar). */
  rating: number
  provisional: boolean
  totalXp: number
  monthlyXp: number
  suspended: boolean
}

export interface TopicRefView {
  topicId: string
  names: TopicNames
  category: string | null
  imageUrl: string | null
}

export interface UserRefView {
  userId: string
  pseudonym: string
  avatarOptions: string | null
  suspended: boolean
}

export type GameOutcome = 'WIN' | 'LOSS' | 'DRAW' | 'WAITING' | 'IN_PROGRESS' | 'CANCELLED'

/** `GET /api/profiles/{id}/games` : historique des parties d'un joueur (filtrable par sujet). */
export interface GameHistoryItemView {
  gameId: string
  topic: TopicRefView
  opponent: UserRefView | null
  /** `HUMAN` ou `BOT`. */
  opponentType: string | null
  outcome: GameOutcome
  myScore: number
  opponentScore: number
  /** XP gagnée (null : entraînement contre un bot). */
  xp: number | null
  playedAt: string
}

/** `GET /api/profiles/{id}/titles`. */
export interface TitlesView {
  /** Clé du titre porté (`topicId:TIER`), null si aucun. */
  equippedKey: string | null
  titles: { key: string; topicId: string; tier: MasteryTier }[]
}

/** `{ id }` renvoyé par une création (`IdResponse` du SDK). */
export interface IdResponse {
  id: string
}

export type PresenceStatus = 'ONLINE' | 'OFFLINE'

/** `GET /api/profiles/{id}/following|followers` : carte joueur. */
export interface PlayerCardView {
  userId: string
  pseudonym: string
  avatarOptions: string | null
  rating: number
  provisional: boolean
  following: boolean
  presence: { userId: string; status: PresenceStatus; lastSeenAt: string | null } | null
  suspended: boolean
}
