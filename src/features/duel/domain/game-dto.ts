import type { TopicRefView as TopicRef, UserRefView as UserRef } from '@/shared/types/bff'

/** Choix de réponse à une question (enum backend `GameQuestionChoice`). */
export type GameChoice = 'A' | 'B' | 'C' | 'D'

/** Garde de type : le choix reçu (clic, payload) est un choix de réponse valide. */
export function isGameChoice(value: string): value is GameChoice {
  return value === 'A' || value === 'B' || value === 'C' || value === 'D'
}

/** Difficulté d'un bot (enum backend `BotDifficulty`). */
export type BotDifficulty = 'EASY' | 'NORMAL' | 'HARD'

export type GamePlayerType = 'HUMAN' | 'BOT'

export type ActiveGameStatus = 'IN_PROGRESS'

/**
 * Partie en cours du joueur (`ActiveGameView`) — bannière « Rejoindre ».
 * `opponent` vaut `null` pour un duel contre le bot.
 */
export interface ActiveGameView {
  gameId: string
  topic: TopicRef
  opponent: UserRef | null
  opponentType: GamePlayerType
  status: ActiveGameStatus
  createdAt: string
}

/** Récompense d'un duel terminé (`GameResultView.reward`) — `null` tant qu'elle est calculée. */
export interface GameResultReward {
  xp: number
  victoryBonus: number
}

/**
 * Vue de résultat d'un duel (`GET /api/games/{gameId}/result`) : bilan autoritaire de la partie,
 * progression du joueur après récompense et enrichissements (sujet + adversaire) pour la page
 * résultat. `reward` arrive après la projection (poll court).
 */
export interface GameResultView {
  myScore: number
  opponentScore: number
  winnerId: string | null
  botGame: boolean
  basePoints: number
  speedBonus: number
  correctAnswers: number
  fastAnswers: number
  answeredRounds: number
  totalRounds: number
  reward: GameResultReward | null
  progression: {
    /** Elo global à l'issue de la partie. */
    rating: number
    peakRating: number
    ratedGames: number
    provisional: boolean
  }
  /** Maîtrise du sujet après la partie (XP dans le sujet, gain, palier). */
  topicMastery: {
    xp: number
    xpGained: number
    tier: string
    nextTier: string | null
    tierProgressPercent: number
    tierRemainingXp: number
  }
  /** Variation d'Elo du joueur et de l'adversaire (0 si non classé). */
  eloDelta?: number
  rated?: boolean
  opponentRating?: number
  opponentEloDelta?: number
  opponentRated?: boolean
  topic: TopicRef
  opponent: UserRef | null
  opponentId: string | null
  botDifficulty: BotDifficulty | null
  /** Compte adversaire supprimé : identité masquée, pas de profil/revanche/signalement. */
  opponentDeleted: boolean
}
