import type { RoomOpponentView } from '@/shared/types/bff'

/**
 * Contrat temps réel de l'**appariement public** (enveloppé par `EventEnvelopeResponse` en
 * REST d'historique comme en WebSocket) — miroir du `MatchmakingNotification` BFF.
 */

export type MatchmakingNotificationType = 'SEARCHING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'

export interface MatchmakingSearchingNotification {
  type: 'SEARCHING'
  ticketId: string
  topicId: string
  /** Fin de la fenêtre de recherche (10 s) — bornes du compte à rebours client. */
  deadlineAt: string
}

export interface MatchmakingMatchedNotification {
  type: 'MATCHED'
  ticketId: string
  /** Salle d'appariement créée : les deux joueurs y apparaissent. */
  roomId: string
  opponentId: string | null
  vsBot: boolean
  /** Adversaire enrichi pour la carte « Adversaire trouvé » (absent : repli sur `GET /api/rooms/{roomId}`). */
  opponent: RoomOpponentView | null
}

export interface MatchmakingCancelledNotification {
  type: 'CANCELLED'
  ticketId: string
}

/** Fenêtre de recherche écoulée (30 s) sans adversaire : relance ou entraînement. */
export interface MatchmakingExpiredNotification {
  type: 'EXPIRED'
  ticketId: string
}

export interface MatchmakingFailedNotification {
  type: 'FAILED'
  ticketId: string
  reason: string
}

export type MatchmakingNotification =
  | MatchmakingSearchingNotification
  | MatchmakingMatchedNotification
  | MatchmakingCancelledNotification
  | MatchmakingExpiredNotification
  | MatchmakingFailedNotification
