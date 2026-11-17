import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { EventEnvelopeResponse } from '@/lib/realtime/notification-stream'
import type { GameChoice } from '@joutio/client/game'
import type { GameNotification } from '@joutio/client/game'

/** Arène : réponse, abandon, bilan et historique. La création passe par la salle. */
export const gameService = {
  answer: (gameId: string, choice: GameChoice) => api.post<void>(ENDPOINTS.games.answer(gameId), { choice }),
  abandon: (gameId: string) => api.post<void>(ENDPOINTS.games.abandon(gameId)),
  notifications: (gameId: string) => api.get<EventEnvelopeResponse<GameNotification>[]>(ENDPOINTS.games.notifications(gameId)),
}
