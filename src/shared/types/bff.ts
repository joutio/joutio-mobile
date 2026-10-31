/**
 * DTOs de la surface BFF consommés par le mobile (mêmes contrats que le web).
 * Voir `services/joutio-bff/AGENTS.md` § 3.
 */

export type Language = "fr" | "en";

/** Pagination BFF (`PageResponse<T>`). */
export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/* ───────────────────────────── Progression / moi ──────────────────────────── */

export interface BadgeView {
  code: string;
  label: string;
  family: string;
  tier: string;
}

export interface ProgressionView {
  badges: BadgeView[];
  /** Elo global du profil (profil, matchmaking, bordure). */
  rating: number;
  peakRating: number;
  ratedGames: number;
  provisional: boolean;
}

export interface DuelStatsView {
  played: number;
  wins: number;
  losses: number;
  draws: number;
  winPercent: number;
  bestScore: number;
  currentWinStreak: number;
  bestWinStreak: number;
}

export interface MeView {
  userId: string;
  email: string;
  pseudonym: string;
  bio: string | null;
  country: string | null;
  avatarOptions: string | null;
  bannerUrl: string | null;
  equippedTitle: string | null;
  language: Language;
  progression: ProgressionView;
  stats: DuelStatsView;
  followingCount: number;
  followersCount: number;
  onboardingCompleted: boolean;
  interests: string[];
  premium: boolean;
}

/** Résultat de recherche (`SuggestionView`). */
export interface SuggestionView {
  type: "TOPIC" | "PLAYER";
  id: string;
  label: string;
  subtitle: string | null;
  category: string | null;
  emoji: string | null;
  color: string | null;
  imageUrl: string | null;
  avatarOptions: string | null;
  names: TopicNames | null;
  suspended: boolean;
}

export interface NotificationPreferenceView {
  category: string;
  enabled: boolean;
}

/* ───────────────────────────────── Sujets ───────────────────────────────── */

export type TopicStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Tris exposés par `GET /api/topics` (enum backend `TopicSort`). */
export type TopicSort = "POPULAR" | "MOST_PLAYED" | "ALPHA" | "RECENT";

export type LeaderboardPeriod = "ALL_TIME" | "MONTHLY";
export type LeaderboardScope = "WORLD" | "FOLLOWING" | "COUNTRY";

/** Noms localisés d'un sujet (clé = code ISO 639-1). */
export type TopicNames = Record<string, string>;

/** Carte de sujet (`TopicCardView`) — catalogue, accueil et sujets suivis. */
export interface TopicCardView {
  topicId: string;
  names: TopicNames;
  description: string | null;
  category: string | null;
  categoryLabel: string | null;
  emoji: string | null;
  color: string | null;
  imageUrl: string | null;
  /** Bannière de la fiche sujet (panoramique, distincte de la couverture). */
  bannerUrl: string | null;
  followersCount: number;
  questionsCount: number;
  followed: boolean;
  status: TopicStatus;
}

/** Référence minimale d'un sujet (`TopicRefView`) — historique, défi. */
export interface TopicRefView {
  topicId: string;
  names: TopicNames;
  category: string | null;
  emoji: string | null;
  color: string | null;
  imageUrl: string | null;
  titles: Record<string, Record<string, string>> | null;
}

/** Compteur d'une catégorie (`TopicFacetsView.CategoryFacetView`). */
export interface TopicFacetView {
  category: string;
  label: string;
  count: number;
}

/** Facettes du catalogue (`TopicFacetsView`). */
export interface TopicFacetsView {
  total: number;
  categories: TopicFacetView[];
}

/** Progression du joueur courant sur un sujet (`TopicOverviewView.MyProgressView`). */
export interface TopicProgressView {
  xp: number;
  /** Parties humaines terminées dans le sujet (abandon inclus) — condition du titre Fer. */
  games: number;
  /** Maîtrise du sujet : palier atteint (`MasteryTier`). */
  tier: string;
  tierProgressPercent: number;
  tierRemainingXp: number;
  nextTier: string | null;
  completedQuestions: number;
  totalQuestions: number;
  completionPercent: number;
}

/** Vue agrégée de la fiche sujet (`TopicOverviewView`). */
export interface TopicOverviewView {
  topic: TopicCardView;
  titles: Record<string, Record<string, string>> | null;
  myRank: number | null;
  myProgress: TopicProgressView;
  canManage: boolean;
}

/** Entrée de classement (`TopicLeaderboardView.EntryView`). */
export interface LeaderboardEntryView {
  rank: number;
  userId: string;
  pseudonym: string | null;
  avatarOptions: string | null;
  country: string | null;
  rating: number;
  provisional: boolean;
  totalXp: number;
  monthlyXp: number;
  suspended: boolean;
}

/** Classement d'un sujet (`TopicLeaderboardView`). */
export interface TopicLeaderboardView {
  entries: Page<LeaderboardEntryView>;
  me: LeaderboardEntryView | null;
}

export interface TopicListParams {
  q?: string;
  category?: string;
  followed?: boolean;
  sort?: TopicSort;
  page?: number;
  size?: number;
}

export interface TopicFacetsParams {
  q?: string;
  followed?: boolean;
}

export interface TopicLeaderboardParams {
  period?: LeaderboardPeriod;
  /** Mois `YYYY-MM` du classement mensuel ; absent = mois courant. */
  month?: string;
  scope?: LeaderboardScope;
  page?: number;
  size?: number;
}

/* ─────────────────────────────── Accueil ────────────────────────────────── */

/** Accueil composé par le BFF (`GET /api/home`). */
export interface HomeView {
  followedTopics: TopicCardView[];
  trendingTopics: TopicCardView[];
  newTopics: TopicCardView[];
}

/* ─────────────────────────────── Joueurs ────────────────────────────────── */

/** Référence minimale d'un joueur (`UserRefView`). */
export interface UserRefView {
  userId: string;
  pseudonym: string;
  avatarOptions: string | null;
  suspended: boolean;
}

export type PresenceStatus = "ONLINE" | "OFFLINE";

export interface PresenceView {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
}

/** Carte joueur des listes Abonnements et Abonnés (`PlayerCardView`). */
export interface PlayerCardView {
  userId: string;
  pseudonym: string;
  avatarOptions: string | null;
  rating: number;
  provisional: boolean;
  following: boolean;
  presence: PresenceView | null;
  suspended: boolean;
}

/** Fiche joueur (`PlayerProfileView`). */
export interface PlayerProfileView {
  userId: string;
  pseudonym: string;
  bio: string | null;
  country: string | null;
  avatarOptions: string | null;
  bannerUrl: string | null;
  equippedTitle: string | null;
  isMe: boolean;
  following: boolean;
  presence: PresenceView | null;
  progression: ProgressionView;
  stats: DuelStatsView;
  followersCount: number;
  followingCount: number;
  suspended: boolean;
  bot: boolean;
}

export interface HeadToHeadView {
  wins: number;
  draws: number;
  losses: number;
}

export interface BadgeItemView {
  code: string;
  label: string;
  tier: string;
  metric: string;
  target: number;
  earned: boolean;
  progress: number;
}

export interface BadgeFamilyView {
  family: string;
  badges: BadgeItemView[];
}

/** Collection de badges (`BadgeCollectionView`). */
export interface BadgeCollectionView {
  earnedCount: number;
  totalCount: number;
  families: BadgeFamilyView[];
}

/** Calendrier de série (`ActivityViewResponse`). */
export interface ActivityView {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  totalActiveDays: number;
  days: { date: string; games: number }[];
}

export interface TitleView {
  key: string;
  topicId: string;
  tier: string;
  tierProgressPercent: number;
  tierRemainingXp: number;
  nextTier: string | null;
  topic: TopicRefView;
}

/** Titres débloqués (`TitlesView`). */
export interface TitlesView {
  equippedKey: string | null;
  titles: TitleView[];
}

export interface RewardView {
  code: string;
  unlocked: boolean;
  unlockedAt: string | null;
  source: string | null;
  condition: { badgeCode: string; badgeLabel: string; target: number } | null;
}

export type GameHistoryOutcome =
  | "WIN"
  | "LOSS"
  | "DRAW"
  | "WAITING"
  | "IN_PROGRESS"
  | "CANCELLED";

/** Ligne d'historique d'un duel, relative au joueur consulté. */
export interface GameHistoryItemView {
  gameId: string;
  topic: TopicRefView;
  opponent: UserRefView | null;
  opponentType: "HUMAN" | "BOT";
  outcome: GameHistoryOutcome;
  myScore: number;
  opponentScore: number;
  xp: number | null;
  playedAt: string;
}

export interface ProfileGamesParams {
  topicId?: string;
  opponentId?: string;
  opponentType?: "HUMAN" | "BOT";
  outcome?: GameHistoryOutcome;
  sort?: "RECENT" | "OLDEST" | "SCORE";
  page?: number;
  size?: number;
}

/* ─────────────────────────── Salles et duels ──────────────────────────── */

export type BotDifficulty = "EASY" | "NORMAL" | "HARD";
export type GameChoice = "A" | "B" | "C" | "D";
export type GameStatus = "IN_PROGRESS" | "FINISHED" | "CANCELED";
export type GamePlayerType = "HUMAN" | "BOT";

export type RoomStatus =
  | "WAITING_PLAYERS"
  | "FETCHING_PLAYERS"
  | "FETCHING_PLAYED_QUESTIONS"
  | "FETCHING_QUESTIONS"
  | "CREATING_GAME"
  | "GAME_CREATED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

export type ChallengeStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELLED"
  | "EXPIRED";

/** Défi nominatif (`ChallengeView`) : `roomId` apparaît après l'acceptation. */
export interface ChallengeView {
  challengeId: string;
  topic: TopicRefView;
  challenger: UserRefView | null;
  opponent: UserRefView | null;
  status: ChallengeStatus;
  roomId: string | null;
  gameId: string | null;
  createdAt: string;
  expiresAt: string;
}

/** Salle temps réel (`RoomView`). */
export interface RoomView {
  roomId: string;
  topic: TopicRefView;
  status: RoomStatus;
  vsBot: boolean;
  canCancel: boolean;
  opponent: UserRefView | null;
  initiatorPresent: boolean;
  participantPresent: boolean;
  gameId: string | null;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

export type MatchmakingStatus =
  | "SEARCHING"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED";

/** Ticket d'appariement public (`MatchmakingTicketView`). */
export interface MatchmakingTicketView {
  ticketId: string;
  topicId: string;
  status: MatchmakingStatus;
  roomId: string | null;
  opponentId: string | null;
  vsBot: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Partie en cours du joueur (`ActiveGameView`). */
export interface ActiveGameView {
  gameId: string;
  topic: TopicRefView;
  opponent: UserRefView | null;
  opponentType: GamePlayerType;
  status: GameStatus;
  createdAt: string;
}

/** Résultat d'un duel terminé (`GameResultView`). */
export interface GameResultView {
  myScore: number;
  opponentScore: number;
  winnerId: string | null;
  botGame: boolean;
  basePoints: number;
  speedBonus: number;
  correctAnswers: number;
  fastAnswers: number;
  answeredRounds: number;
  totalRounds: number;
  reward: { xp: number; victoryBonus: number } | null;
  progression: {
    rating: number;
    peakRating: number;
    ratedGames: number;
    provisional: boolean;
  };
  opponentRating: number;
  opponentRated: boolean;
  topic: TopicRefView;
  opponent: UserRefView | null;
  opponentId: string | null;
  botDifficulty: BotDifficulty | null;
}
