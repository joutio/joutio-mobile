import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { EventEnvelopeResponse } from '@/lib/realtime/notification-stream'
import type { GameChoice } from '@joutio/client/game'
import type { GameNotification } from '@joutio/client/game'

/** Arène : réponse, abandon, bilan et historique. La création passe par la salle. */
export const gameService = {
  /** Réponse à la manche `round` (1 à 7) : la manche rend le renvoi sûr. */
  /** `clientElapsedMs` : temps de réflexion depuis l'affichage des réponses, borné par le serveur. */
  answer: (gameId: string, round: number, choice: GameChoice, clientElapsedMs: number, signal?: AbortSignal) =>
    api.post<void>(ENDPOINTS.games.answer(gameId), { round, choice, clientElapsedMs }, { signal }),
  abandon: (gameId: string) => api.post<void>(ENDPOINTS.games.abandon(gameId)),
  notifications: (gameId: string) => api.get<EventEnvelopeResponse<GameNotification>[]>(ENDPOINTS.games.notifications(gameId)),
}
