import type { RoomView } from '@joutio/client-domain/rooms'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { ChallengeView } from '@joutio/client-domain/api-types'

/** Défis nominatifs et salons du joueur (`/api/challenges`, `/api/rooms`). */
export const challengesService = {
  mine: () => api.get<ChallengeView[]>(ENDPOINTS.challenges.mine),
  rooms: () => api.get<RoomView[]>(ENDPOINTS.rooms.mine),
  accept: (challengeId: string) => api.post<void>(ENDPOINTS.challenges.accept(challengeId)),
  decline: (challengeId: string) => api.post<void>(ENDPOINTS.challenges.decline(challengeId)),
  cancel: (challengeId: string) => api.post<void>(ENDPOINTS.challenges.cancel(challengeId)),
  cancelRoom: (roomId: string) => api.post<void>(ENDPOINTS.rooms.cancel(roomId)),
}

/**
 * Plafond des défis en attente et des salons ouverts (`DuelLimitPolicy` du BFF, `joutio.duel.limits.*`, 5 par
 * défaut). Le BFF ne l'expose pas : la valeur par défaut est reprise ici.
 */
export const CHALLENGE_LIMIT = 5

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Délai lisible : « 23 h », « 45 min », « 3 j ». */
export function duration(ms: number) {
  const value = Math.max(0, ms)
  if (value >= 2 * DAY) return `${Math.floor(value / DAY)} j`
  if (value >= HOUR) return `${Math.floor(value / HOUR)} h`
  return `${Math.max(1, Math.floor(value / 60_000))} min`
}
