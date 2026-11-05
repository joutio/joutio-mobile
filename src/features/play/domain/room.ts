import type { RoomNotification } from './room-notification'
import type { RoomOpponentView, TopicRefView as TopicRef } from '@/shared/types/bff'

/**
 * Statut serveur d'une salle (enum backend `RoomStatus`) : cycle de vie + avancement de la
 * préparation de la partie.
 */
export type RoomStatus =
  | 'WAITING_PLAYERS'
  | 'FETCHING_PLAYERS'
  | 'FETCHING_PLAYED_QUESTIONS'
  | 'FETCHING_QUESTIONS'
  | 'CREATING_GAME'
  | 'GAME_CREATED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'FAILED'

/** Vue d'une salle (`RoomView`). Le partage se fait via `/join/{roomId}`. */
export interface RoomView {
  roomId: string
  topic: TopicRef
  status: RoomStatus
  vsBot: boolean
  /** Vrai si le viewer est l'initiateur (seul habilité à annuler la salle). */
  canCancel: boolean
  opponent: RoomOpponentView | null
  initiatorPresent: boolean
  participantPresent: boolean
  gameId: string | null
  createdAt: string
  expiresAt: string
  updatedAt: string
}

/**
 * Read model client d'une salle — reconstruit exclusivement par fold des notifications
 * (historique REST + push WebSocket).
 */
export interface Room {
  roomId: string
  topicId: string | null
  initiatorId: string | null
  opponentId: string | null
  participantId: string | null
  vsBot: boolean
  status: RoomStatus
  gameId: string | null
  expiresAt: string | null
  initiatorPresent: boolean
  participantPresent: boolean
  /** Dernière relance (« wizz ») observée : joueur émetteur et instant (cadence anti-spam). */
  lastWizz: { playerId: string; wizzedAt: string } | null
}

/** Cadence anti-spam entre deux relances du même joueur (miroir backend `RoomWizzRules`). */
export const WIZZ_COOLDOWN_MS = 10_000

/** État de relance du viewer : disponibilité et fin de cadence éventuelle (epoch ms). */
export interface WizzState {
  /** Peut relancer maintenant (salle nominative, adversaire humain absent, cadence écoulée). */
  available: boolean
  /** Fin de la cadence du viewer ; `null` quand aucune relance récente ne la déclenche. */
  cooldownEndsAt: number | null
}

export function emptyRoom(roomId: string): Room {
  return {
    roomId,
    topicId: null,
    initiatorId: null,
    opponentId: null,
    participantId: null,
    vsBot: false,
    status: 'WAITING_PLAYERS',
    gameId: null,
    expiresAt: null,
    initiatorPresent: false,
    participantPresent: false,
    lastWizz: null,
  }
}

/**
 * Relance possible ? Salle nominative en attente, viewer présent, adversaire humain absent,
 * cadence du viewer écoulée. Le serveur reste l'arbitre (agrégat) — ce calcul pilote le bouton.
 */
export function wizzState(room: Room, viewerId: string | null, nowMs: number): WizzState {
  const unavailable: WizzState = { available: false, cooldownEndsAt: null }
  if (!viewerId || room.vsBot || room.opponentId === null) return unavailable
  if (room.status !== 'WAITING_PLAYERS') return unavailable

  const viewerIsInitiator = room.initiatorId === viewerId
  if (!viewerIsInitiator && room.participantId !== viewerId) return unavailable
  const viewerPresent = viewerIsInitiator ? room.initiatorPresent : room.participantPresent
  const opponentPresent = viewerIsInitiator ? room.participantPresent : room.initiatorPresent
  if (!viewerPresent || opponentPresent) return unavailable

  const cooldownEndsAt = room.lastWizz?.playerId === viewerId ? Date.parse(room.lastWizz.wizzedAt) + WIZZ_COOLDOWN_MS : null
  const available = cooldownEndsAt === null || Number.isNaN(cooldownEndsAt) || cooldownEndsAt <= nowMs
  return {
    available,
    cooldownEndsAt: cooldownEndsAt !== null && !Number.isNaN(cooldownEndsAt) ? cooldownEndsAt : null,
  }
}

/** Étapes de préparation affichées par le stepper (ordre du flux serveur). */
export const PREPARATION_STEPS = [
  { id: 'players', label: 'Les joueurs arrivent…' },
  { id: 'profiles', label: 'Chargement des profils…' },
  { id: 'questions', label: 'Tirage des questions…' },
  { id: 'launch', label: 'Lancement du duel…' },
] as const

/**
 * Index de l'étape en cours pour le stepper (`PREPARATION_STEPS.length` = préparation
 * terminée, la salle redirige alors vers l'arène).
 */
export function preparationStep(status: RoomStatus): number {
  switch (status) {
    case 'WAITING_PLAYERS':
      return 0
    case 'FETCHING_PLAYERS':
      return 1
    case 'FETCHING_PLAYED_QUESTIONS':
    case 'FETCHING_QUESTIONS':
      return 2
    case 'CREATING_GAME':
    case 'GAME_CREATED':
      return 3
    case 'COMPLETED':
      return PREPARATION_STEPS.length
    default:
      return 0
  }
}

/** Préparation terminée (lancement en cours ou partie créée) : wrapper du stepper en vert. */
export function preparationComplete(status: RoomStatus): boolean {
  return status === 'CREATING_GAME' || status === 'GAME_CREATED' || status === 'COMPLETED'
}

/**
 * Libellé d'état d'une salle d'attente : présence complète, puis attente nommée de
 * l'adversaire. Affiché dans le pill, au-dessus du stepper d'étapes.
 */
export function waitingStatusLabel({
  playerPresent,
  opponentPresent,
  opponentLabel,
}: {
  playerPresent: boolean
  opponentPresent: boolean
  opponentLabel: string | null
}): string {
  if (playerPresent && opponentPresent) return 'Les deux joueurs sont là'
  if (opponentLabel) return `En attente de ${opponentLabel}`
  return "En attente d'un adversaire"
}

/** Fold idempotent : rejouer une notification (même séquence) ne change pas l'état final. */
export function applyRoomNotification(room: Room, notification: RoomNotification): Room {
  switch (notification.type) {
    case 'ROOM_CREATED':
      return {
        ...room,
        topicId: notification.topicId,
        initiatorId: notification.initiatorId,
        opponentId: notification.opponentId,
        vsBot: notification.vsBot,
        expiresAt: notification.expiresAt,
        status: 'WAITING_PLAYERS',
      }
    case 'ROOM_ENTERED': {
      const isInitiator = notification.playerId === room.initiatorId
      const participantId = !isInitiator && room.participantId === null ? notification.playerId : room.participantId
      return {
        ...room,
        participantId,
        initiatorPresent: room.initiatorPresent || isInitiator,
        participantPresent: room.participantPresent || (!isInitiator && notification.playerId === participantId),
      }
    }
    case 'ROOM_LEFT': {
      const isInitiator = notification.playerId === room.initiatorId
      const isParticipant = notification.playerId === room.participantId
      if (!isInitiator && !isParticipant) return room
      // Sortie non destructive : seule la présence s'éteint, la salle reste ouverte.
      return {
        ...room,
        initiatorPresent: isInitiator ? false : room.initiatorPresent,
        participantPresent: isParticipant ? false : room.participantPresent,
      }
    }
    case 'ROOM_WIZZED':
      // Pur temps réel : aucune mutation de la salle, seule la cadence du joueur émetteur est
      // mémorisée (le bouton « Wizzer » se grise jusqu'à l'échéance).
      return {
        ...room,
        lastWizz: {
          playerId: notification.playerId,
          wizzedAt: notification.wizzedAt,
        },
      }
    case 'ROOM_ALL_PRESENT':
      return {
        ...room,
        status: 'FETCHING_PLAYERS',
      }
    case 'ROOM_PLAYERS_LOADED':
      return { ...room, status: 'FETCHING_PLAYED_QUESTIONS' }
    case 'ROOM_PLAYED_QUESTIONS_LOADED':
      return { ...room, status: 'FETCHING_QUESTIONS' }
    case 'ROOM_QUESTIONS_LOADED':
      return {
        ...room,
        status: 'CREATING_GAME',
      }
    case 'ROOM_GAME_CREATED':
      return {
        ...room,
        status: 'GAME_CREATED',
        gameId: notification.gameId,
      }
    case 'ROOM_COMPLETED':
      return {
        ...room,
        status: 'COMPLETED',
        gameId: notification.gameId,
      }
    case 'ROOM_CANCELLED':
      return { ...room, status: 'CANCELLED' }
    case 'ROOM_EXPIRED':
      return { ...room, status: 'EXPIRED' }
    case 'ROOM_FAILED':
      return { ...room, status: 'FAILED' }

    default: {
      // Exhaustivité : ajouter un type non géré casse la compilation.
      const unreachable: never = notification
      void unreachable
      return room
    }
  }
}
