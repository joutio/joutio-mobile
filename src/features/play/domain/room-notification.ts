/**
 * Contrat temps réel d'une **salle** (enveloppé par `EventEnvelopeResponse` en REST
 * d'historique comme en WebSocket) — miroir du `RoomNotification` BFF.
 */

export type RoomNotificationType =
  'ROOM_CREATED' | 'ROOM_COMPLETED' | 'ROOM_CANCELLED' | 'ROOM_EXPIRED' | 'ROOM_FAILED' | 'ROOM_ENTERED' | 'ROOM_LEFT' | 'ROOM_ALL_PRESENT'

export interface RoomCreatedNotification {
  type: 'ROOM_CREATED'
  roomId: string
  topicId: string
  initiatorId: string
  /** Salle nominative : seul cet invité peut apparaître comme second joueur. */
  opponentId: string | null
  /** Salle contre le bot : le second joueur est joint automatiquement. */
  vsBot: boolean
  expiresAt: string | null
}

export interface RoomCompletedNotification {
  type: 'ROOM_COMPLETED'
  roomId: string
  gameId: string
}

export interface RoomCancelledNotification {
  type: 'ROOM_CANCELLED'
  roomId: string
  reason: string
}

export interface RoomExpiredNotification {
  type: 'ROOM_EXPIRED'
  roomId: string
}

export interface RoomFailedNotification {
  type: 'ROOM_FAILED'
  roomId: string
  reason: string
}

export interface RoomEnteredNotification {
  type: 'ROOM_ENTERED'
  roomId: string
  playerId: string
}

export interface RoomLeftNotification {
  type: 'ROOM_LEFT'
  roomId: string
  playerId: string
}

/**
 * Relance (« wizz ») d'un adversaire absent — pur temps réel : le joueur émetteur et l'instant
 * permettent au client de caler la cadence (anti-spam) sans rechargement.
 */
export interface RoomWizzedNotification {
  type: 'ROOM_WIZZED'
  roomId: string
  /** Le joueur qui relance. */
  playerId: string
  /** L'adversaire relancé (absent de la salle). */
  targetId: string
  wizzedAt: string
}

export interface RoomAllPlayersPresentNotification {
  type: 'ROOM_ALL_PRESENT'
  roomId: string
}

/** Profils des joueurs résolus (avancement de la préparation). */
export interface RoomPlayersLoadedNotification {
  type: 'ROOM_PLAYERS_LOADED'
  roomId: string
}

/** Historique des questions jouées résolu (avancement de la préparation). */
export interface RoomPlayedQuestionsLoadedNotification {
  type: 'ROOM_PLAYED_QUESTIONS_LOADED'
  roomId: string
}

/** Questions tirées : la saga lance la création de la partie. */
export interface RoomQuestionsLoadedNotification {
  type: 'ROOM_QUESTIONS_LOADED'
  roomId: string
}

/** Le service game a accusé la création : `gameId` est le deep link de l'arène. */
export interface RoomGameCreatedNotification {
  type: 'ROOM_GAME_CREATED'
  roomId: string
  gameId: string
}

export type RoomNotification =
  | RoomCreatedNotification
  | RoomCompletedNotification
  | RoomCancelledNotification
  | RoomExpiredNotification
  | RoomFailedNotification
  | RoomEnteredNotification
  | RoomLeftNotification
  | RoomWizzedNotification
  | RoomAllPlayersPresentNotification
  | RoomPlayersLoadedNotification
  | RoomPlayedQuestionsLoadedNotification
  | RoomQuestionsLoadedNotification
  | RoomGameCreatedNotification
