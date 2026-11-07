/** Contrats de la surface BFF (`services/joutio-bff/AGENTS.md` § 3), limités à ce que l'app consomme. */

export type Language = 'fr' | 'en'
export type TopicNames = Record<string, string>
export type TopicStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/** `GET /api/me`, champs lus par l'app. */
export interface MeView {
  userId: string
  email: string
  pseudonym: string
  bio: string | null
  /** Code ISO-3166 alpha-2, `null` si non renseigné (portée Pays des classements). */
  country: string | null
  /** Options DiceBear sérialisées (JSON), `null` : avatar de base. */
  avatarOptions: string | null
  bannerUrl: string | null
  /** Clé du titre porté (`topicId:TIER`), null si aucun. */
  equippedTitle: string | null
  followingCount: number
  followersCount: number
  /** Codes des récompenses débloquées. */
  rewards: string[]
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
  losses: number
  draws: number
  winPercent: number
  bestScore: number
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
  /** Titres thématiques par langue puis palier (`{ fr: { OR: "Connétable" } }`) ; absent : repli « palier · sujet ». */
  titles?: Record<string, Record<string, string>> | null
}

export interface UserRefView {
  userId: string
  pseudonym: string
  avatarOptions: string | null
  suspended: boolean
}

/** `RoomView.opponent` / notification `MATCHED` : adversaire enrichi par le BFF (Elo, pays). */
export interface RoomOpponentView extends UserRefView {
  rating: number | null
  provisional: boolean | null
  country: string | null
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
  titles: TitleView[]
}

export interface TitleView {
  key: string
  topicId: string
  tier: MasteryTier
  tierProgressPercent: number
  tierRemainingXp: number
  nextTier: MasteryTier | null
  topic: TopicRefView
}

/** `{ id }` renvoyé par une création (`IdResponse` du SDK). */
export interface IdResponse {
  id: string
}

export type PresenceStatus = 'ONLINE' | 'OFFLINE'

export type PeopleSort = 'PRESENCE' | 'RECENT' | 'ELO' | 'ALPHA'

export interface PresenceView {
  userId: string
  status: PresenceStatus
  lastSeenAt: string | null
}

/** `GET /api/profiles/{id}` : fiche joueur complète (profil public + progression + stats). */
export interface PlayerProfileView {
  userId: string
  pseudonym: string
  bio: string | null
  country: string | null
  avatarOptions: string | null
  bannerUrl: string | null
  /** Clé du titre porté (`topicId:TIER`), null si aucun. */
  equippedTitle: string | null
  isMe: boolean
  following: boolean
  presence: PresenceView | null
  progression: ProgressionView | null
  stats: DuelStatsView | null
  followersCount: number
  followingCount: number
  suspended: boolean
  bot: boolean
}

/** `GET /api/profiles/{id}/topics` : sujet joué par un joueur. */
export interface TopicStatView {
  topicId: string
  names: TopicNames
  emoji: string | null
  color: string | null
  imageUrl: string | null
  games: number
  xp: number
}

/** `GET /api/profiles/{id}/head-to-head?against=` : bilan des duels communs. */
export interface HeadToHeadView {
  played: number
  wins: number
  losses: number
  draws: number
}

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

export type ChallengeStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED'

/** `GET /api/challenges/{id}` : défi nominatif (revanche quand `gameId` est présent). */
export interface ChallengeView {
  challengeId: string
  topic: TopicRefView
  challenger: UserRefView
  opponent: UserRefView
  status: ChallengeStatus
  /** Salle créée à l'acceptation. */
  roomId: string | null
  gameId: string | null
  createdAt: string
  expiresAt: string
}

export type UserReportReason = 'HARASSMENT' | 'HATE_SPEECH' | 'INAPPROPRIATE_CONTENT' | 'CHEATING' | 'SPAM' | 'OTHER'
export type QuestionReportReason = 'QUESTION' | 'IMAGE' | 'ANSWERS'

export type BadgeFamily =
  | 'VOLUME'
  | 'VICTORY'
  | 'MASTERY'
  | 'EXPLOIT'
  | 'SERIES'
  | 'ASSIDUITY'
  | 'SOCIAL'
  | 'CHALLENGES'
  | 'VISION'
  | 'PRECISION'
  | 'SPEED'
  | 'EXPLORATION'
  | 'COLLECTION'

/** Un palier de badge (`BadgeCollectionView.BadgeItemView`). */
export interface BadgeItemView {
  code: string
  /** Libellé source (français) du catalogue. */
  label: string
  tier: MasteryTier
  metric: string
  target: number
  earned: boolean
  /** Compteur courant, plafonné à `target`. */
  progress: number
}

/** `GET /api/profiles/{id}/badges` : collection par famille. */
export interface BadgeCollectionView {
  earnedCount: number
  totalCount: number
  families: { family: BadgeFamily; badges: BadgeItemView[] }[]
}

/** `GET /api/profiles/{id}/activity` : série et jours joués (fenêtre de 365 jours par défaut). */
export interface ActivityView {
  userId: string
  currentStreak: number
  longestStreak: number
  /** `YYYY-MM-DD`, fuseau d'activité du profil. */
  lastActiveDate: string | null
  totalActiveDays: number
  days: { date: string; games: number }[]
}

/** `GET /api/me/rewards` : catalogue des récompenses (styles d'avatar). */
export interface RewardsView {
  rewards: {
    code: string
    unlocked: boolean
    unlockedAt: string | null
    source: string | null
    condition: { badgeCode: string; badgeLabel: string; target: number }
  }[]
}

export type NotificationCategory = 'FOLLOW' | 'ROOM' | 'QUESTION'

/** `GET /api/notification-preferences`. */
export interface NotificationPreferenceView {
  category: NotificationCategory
  enabled: boolean
}

/** `GET /api/suggestions?q=&limit=` : résultat de la recherche globale (sujets et joueurs). */
export interface SuggestionView {
  type: 'TOPIC' | 'PLAYER'
  id: string
  label: string
  subtitle: string | null
  category: string | null
  emoji: string | null
  color: string | null
  imageUrl: string | null
  avatarOptions: string | null
  names: TopicNames | null
  suspended: boolean
}
