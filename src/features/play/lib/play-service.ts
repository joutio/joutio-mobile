import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { EventEnvelopeResponse } from '@/lib/realtime/notification-stream'
import type { IdResponse, PageResponse, PlayerCardView } from '@/shared/types/bff'
import type { BotDifficulty } from '@/features/duel/domain/game-dto'
import type { MatchmakingTicket } from '../domain/matchmaking'
import type { MatchmakingNotification } from '../domain/matchmaking-notification'
import type { RoomView } from '../domain/room'
import type { RoomNotification } from '../domain/room-notification'

export const CONTACTS_PAGE_SIZE = 20

/**
 * Préparation d'une partie (`lancer-partie.md`, `matchmaking.md`) : la salle est l'unique point d'entrée (partagée,
 * bot, défi) ; le matchmaking public crée une salle à l'issue de la recherche.
 */
export const playService = {
  createRoom: (topicId: string) => api.post<IdResponse>(ENDPOINTS.rooms.create, { topicId }),
  createBotRoom: (topicId: string, difficulty: BotDifficulty) => api.post<IdResponse>(ENDPOINTS.rooms.bot, { topicId, difficulty }),
  room: (roomId: string) => api.get<RoomView>(ENDPOINTS.rooms.get(roomId)),
  /** Apparition dans la salle (idempotent) : présence, et participant pour le second humain. */
  joinRoom: (roomId: string) => api.post<void>(ENDPOINTS.rooms.join(roomId)),
  leaveRoom: (roomId: string) => api.post<void>(ENDPOINTS.rooms.leave(roomId)),
  cancelRoom: (roomId: string) => api.post<void>(ENDPOINTS.rooms.cancel(roomId)),
  roomNotifications: (roomId: string) => api.get<EventEnvelopeResponse<RoomNotification>[]>(ENDPOINTS.rooms.notifications(roomId)),

  enqueue: (topicId: string) => api.post<MatchmakingTicket>(ENDPOINTS.matchmaking.tickets, { topicId }),
  cancelTicket: (ticketId: string) => api.post<void>(ENDPOINTS.matchmaking.cancel(ticketId)),
  ticketNotifications: (ticketId: string) => api.get<EventEnvelopeResponse<MatchmakingNotification>[]>(ENDPOINTS.matchmaking.notifications(ticketId)),

  /** Défi nominatif : crée une salle réservée à l'invité, qui l'accepte depuis ses Défis. */
  challenge: (topicId: string, opponentId: string) => api.post<IdResponse>(ENDPOINTS.challenges.create, { topicId, opponentId }),

  contacts: (userId: string, direction: 'following' | 'followers', query: string, page: number) =>
    api.get<PageResponse<PlayerCardView>>(ENDPOINTS.profiles[direction](userId), {
      params: { q: query || undefined, page, size: CONTACTS_PAGE_SIZE },
    }),

  setAutoTrain: (userId: string, enabled: boolean) => api.put<void>(ENDPOINTS.profiles.autoTrain(userId), { enabled }),
}
