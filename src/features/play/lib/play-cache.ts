import type { QueryClient } from '@tanstack/react-query'
import type { ChallengeStatus, ChallengeView } from '@joutio/client-domain/api-types'
import { queryKeys } from '@/lib/query-keys'
import { nameUuid } from '@/shared/utils/name-uuid'
import type { RoomStatus, RoomView } from '@joutio/client-domain/rooms'

/** A successful command must not be undone by an older CQRS projection. */
export function reconcileChallenges(previous: ChallengeView[] | undefined, incoming: ChallengeView[]): ChallengeView[] {
  const decided = new Map(previous?.filter((item) => item.status !== 'PENDING').map((item) => [item.challengeId, item]))
  return [
    ...(previous ?? []).filter((item) => item.challengeId.startsWith('pending-') && !incoming.some((remote) => remote.challengeId === item.challengeId)),
    ...incoming.map((item) => (item.status === 'PENDING' ? (decided.get(item.challengeId) ?? item) : item)),
  ]
}

export function reconcileRooms(previous: RoomView[] | undefined, incoming: RoomView[]): RoomView[] {
  const advanced = new Map(previous?.filter((item) => item.status !== 'WAITING_PLAYERS').map((item) => [item.roomId, item]))
  return [
    ...(previous ?? []).filter((item) => item.roomId.startsWith('pending-') && !incoming.some((remote) => remote.roomId === item.roomId)),
    ...incoming.map((item) => (item.status === 'WAITING_PLAYERS' ? (advanced.get(item.roomId) ?? item) : item)),
  ]
}

export function settleChallenge(client: QueryClient, id: string, status: ChallengeStatus) {
  client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) => items?.map((item) => (item.challengeId === id ? { ...item, status } : item)))
}

/** Sync both list consumers and the detail used when returning from the room. */
export function settleRoom(client: QueryClient, id: string, status: RoomStatus) {
  client.setQueriesData<RoomView[]>(
    { predicate: (query) => query.queryKey[0] === 'tracked-rooms' || (query.queryKey[0] === 'rooms' && query.queryKey[1] === 'mine') },
    (items) => items?.map((item) => (item.roomId === id ? { ...item, status } : item)),
  )
  client.setQueryData<RoomView>(['rooms', id], (item) => (item ? { ...item, status } : item))
  if (status !== 'WAITING_PLAYERS')
    client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
      items?.map((item) =>
        item.status === 'PENDING' && (item.roomId === id || nameUuid(`room:${item.challengeId}`) === id)
          ? { ...item, status: status === 'CANCELLED' || status === 'FAILED' ? 'CANCELLED' : status === 'EXPIRED' ? 'EXPIRED' : 'ACCEPTED' }
          : item,
      ),
    )
}
