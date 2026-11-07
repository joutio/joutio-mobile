import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { EventEnvelopeResponse } from '@/lib/realtime/notification-stream'
import type { ActiveGameView, GameChoice, GameResultView } from '../domain/game-dto'
import type { GameNotification } from '../domain/game-notification'

/** Arène : réponse, abandon, bilan et historique. La création passe par la salle. */
export const gameService = {
  active: () => api.get<ActiveGameView[]>(ENDPOINTS.games.active, { params: { active: true } }),
  answer: (gameId: string, choice: GameChoice) => api.post<void>(ENDPOINTS.games.answer(gameId), { choice }),
  abandon: (gameId: string) => api.post<void>(ENDPOINTS.games.abandon(gameId)),
  result: (gameId: string) => api.get<GameResultView>(ENDPOINTS.games.result(gameId)),
  notifications: (gameId: string) => api.get<EventEnvelopeResponse<GameNotification>[]>(ENDPOINTS.games.notifications(gameId)),
}
