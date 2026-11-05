import type { MatchmakingNotification } from './matchmaking-notification'

/** Statut serveur d'un ticket (enum backend `MatchmakingStatus`, réduit au cycle de vie). */
export type MatchmakingServerStatus = 'SEARCHING' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'

/**
 * État client d'une recherche, foldé des notifications : `MATCHED`/`CANCELLED`/`EXPIRED` sont des
 * issues terminales (le statut serveur porte `COMPLETED`/`CANCELLED`/`EXPIRED`).
 */
export type MatchmakingStatus = 'SEARCHING' | 'MATCHED' | 'CANCELLED' | 'EXPIRED' | 'FAILED'

/** Vue d'un ticket (`MatchmakingTicketView`). */
export interface MatchmakingTicket {
  ticketId: string
  topicId: string
  status: MatchmakingServerStatus
  roomId: string | null
  opponentId: string | null
  vsBot: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Read model client d'une recherche — reconstruit par fold des notifications
 * (historique REST + push WebSocket).
 */
export interface Matchmaking {
  ticketId: string
  topicId: string | null
  status: MatchmakingStatus
  roomId: string | null
  opponentId: string | null
  vsBot: boolean
  /** Fin de la fenêtre de recherche (10 s) — échéance serveur du compte à rebours. */
  deadlineAt: string | null
}

export function emptyMatchmaking(ticketId: string): Matchmaking {
  return {
    ticketId,
    topicId: null,
    status: 'SEARCHING',
    roomId: null,
    opponentId: null,
    vsBot: false,
    deadlineAt: null,
  }
}

/** Fold idempotent : rejouer une notification (même séquence) ne change pas l'état final. */
export function applyMatchmakingNotification(ticket: Matchmaking, notification: MatchmakingNotification): Matchmaking {
  switch (notification.type) {
    case 'SEARCHING':
      return {
        ...ticket,
        topicId: notification.topicId,
        status: 'SEARCHING',
        deadlineAt: notification.deadlineAt,
      }
    case 'MATCHED':
      return {
        ...ticket,
        status: 'MATCHED',
        roomId: notification.roomId,
        opponentId: notification.opponentId,
        vsBot: notification.vsBot,
      }
    case 'CANCELLED':
      return { ...ticket, status: 'CANCELLED' }
    case 'EXPIRED':
      return { ...ticket, status: 'EXPIRED' }
    case 'FAILED':
      return { ...ticket, status: 'FAILED' }

    default: {
      const unreachable: never = notification
      void unreachable
      return ticket
    }
  }
}
