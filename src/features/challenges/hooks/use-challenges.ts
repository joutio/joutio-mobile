import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { router } from '@/shared/navigation/router'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { applyRoomPresence, type RoomView } from '@joutio/client/rooms'
import { roomOfChallenge } from '@/features/play/hooks/use-rematch'
import { challengesQuery, myRoomsQuery, optimisticUpdate, queryKeys } from '@joutio/client/query'
import { useRoomPresenceEvents } from '@/lib/realtime/personal-notifications'
import type { ChallengeView } from '@joutio/client/api-types'
import { topicName } from '@/shared/utils/topic-name'
import { reconcileChallenges, reconcileRooms, settleChallenge, settleRoom } from '@/features/play/lib/play-cache'
import { challengesService } from '../lib/challenges-service'
import { useT } from '@/lib/i18n'
import { api } from '@/lib/api'

/** Défis du joueur (reçus et envoyés). */
export function useMyChallenges(enabled = true) {
  const client = useQueryClient()
  return useQuery({
    queryKey: queryKeys.challenges(),
    queryFn: async () => reconcileChallenges(client.getQueryData(queryKeys.challenges()), await challengesQuery(api).queryFn()),
    enabled,
    staleTime: 15_000,
  })
}

/** Salons du joueur. */
export function useMyRooms(enabled = true) {
  const client = useQueryClient()
  return useQuery({
    queryKey: queryKeys.myRooms(),
    queryFn: async () => reconcileRooms(client.getQueryData(queryKeys.myRooms()), await myRoomsQuery(api).queryFn()),
    enabled,
    staleTime: 15_000,
  })
}

/** Défis en attente, répartis : reçus (par échéance la plus proche) et envoyés. */
export function splitChallenges(challenges: readonly ChallengeView[] | undefined, userId: string) {
  const pending = (challenges ?? []).filter((challenge) => challenge.status === 'PENDING')
  const received = pending.filter((challenge) => challenge.opponent.userId === userId).sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt))
  const sent = pending.filter((challenge) => challenge.challenger.userId === userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return { received, sent }
}

/** Salons humains accessibles : privés, défis acceptés et préparation en cours. */
export const resumableRooms = (rooms: readonly RoomView[] | undefined) =>
  (rooms ?? []).filter((room) => !room.vsBot && !['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(room.status))

/** Relit défis et salons : événements d'un autre joueur, jamais la confirmation d'une commande locale. */
export function refreshChallenges(client: QueryClient) {
  void client.invalidateQueries({ queryKey: queryKeys.challenges() })
  void client.invalidateQueries({ queryKey: queryKeys.myRooms() })
}

/**
 * Présence dans mes salons, poussée sur le flux personnel (`ROOM_PRESENCE`) : appliquée au cache des salons pour la
 * pastille de l'onglet Défis. Défis et salons sont relus par `RealtimeInvalidation` (événements et reconnexion). Monté
 * une fois, dans le layout des onglets.
 */
export function useChallengesRealtime() {
  const client = useQueryClient()
  const userId = useMe(true).data?.userId
  // Présence portée par le message : appliquée sur place (la projection serveur peut être en retard), salon inconnu = relu.
  useRoomPresenceEvents(userId, (presence) => {
    const rooms = client.getQueryData<RoomView[]>(queryKeys.myRooms())
    const next = rooms && userId ? applyRoomPresence(rooms, presence, userId) : undefined
    if (next) client.setQueryData(queryKeys.myRooms(), next)
    else void client.invalidateQueries({ queryKey: queryKeys.myRooms() })
  })
}

/** Apply each confirmed command separately: partial bulk failure keeps successful decisions. */
function useChallengeMutation(run: (id: string) => Promise<unknown>, status: 'DECLINED' | 'CANCELLED', error: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    onMutate: async (ids: readonly string[]) => {
      const previous = client.getQueryData<ChallengeView[]>(queryKeys.challenges())
      const transaction = await optimisticUpdate(client, [queryKeys.challenges()], () => {
        for (const id of ids) settleChallenge(client, id, status)
      })
      return { ...transaction, previous }
    },
    mutationFn: async (ids: readonly string[]) => {
      const results = await Promise.allSettled(ids.map(run))
      const failed = ids.filter((_id, index) => results[index]?.status === 'rejected')
      if (failed.length) throw Object.assign(new Error('partial failure'), { failed })
    },
    onError: (cause, ids, context) => {
      // Restore only rejected IDs; successful commands stay applied.
      const failed = 'failed' in cause && Array.isArray(cause.failed) ? (cause.failed as string[]) : [...ids]
      client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
        items?.map((item) =>
          failed.includes(item.challengeId)
            ? { ...item, status: context?.previous?.find((previous) => previous.challengeId === item.challengeId)?.status ?? 'PENDING' }
            : item,
        ),
      )
      toast.error(error, { description: t('challenges.retryText') })
    },
  })
}

export const useDeclineChallenges = () => {
  const t = useT()
  return useChallengeMutation(challengesService.decline, 'DECLINED', t('challenges.declineError'))
}
export const useCancelChallenge = () => {
  const t = useT()
  return useChallengeMutation(challengesService.cancel, 'CANCELLED', t('challenges.cancelError'))
}

/** Accepter : la salle du défi est calculée comme le serveur, puis ouverte. */
export function useAcceptChallenge() {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    onMutate: (challenge: ChallengeView) =>
      optimisticUpdate(client, [queryKeys.challenges(), queryKeys.myRooms()], () => settleChallenge(client, challenge.challengeId, 'ACCEPTED')),
    mutationFn: (challenge: ChallengeView) => challengesService.accept(challenge.challengeId),
    onSuccess: (_result, challenge) => {
      const roomId = challenge.roomId ?? roomOfChallenge(challenge.challengeId)
      client.setQueryData<RoomView[]>(queryKeys.myRooms(), (items) =>
        items?.some((room) => room.roomId === roomId)
          ? items
          : [
              {
                roomId,
                topic: challenge.topic,
                status: 'WAITING_PLAYERS',
                vsBot: false,
                canCancel: false,
                opponent: null,
                initiatorPresent: false,
                participantPresent: false,
                gameId: null,
                createdAt: new Date().toISOString(),
                expiresAt: challenge.expiresAt,
                updatedAt: new Date().toISOString(),
              },
              ...(items ?? []),
            ],
      )
      router.push({
        pathname: '/room/[roomId]',
        params: {
          roomId: challenge.roomId ?? roomOfChallenge(challenge.challengeId),
          topicId: challenge.topic.topicId,
          topicName: topicName(challenge.topic.names),
          category: challenge.topic.category ?? '',
        },
      })
    },
    onError: (_error, _challenge, context) => {
      context?.rollback()
      toast.error(t('challenges.acceptError'))
    },
  })
}

/** Fermer un salon privé. */
export function useCloseRoom() {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (roomId: string) => challengesService.cancelRoom(roomId),
    onMutate: (roomId: string) =>
      optimisticUpdate(client, [queryKeys.myRooms(), queryKeys.room(roomId), queryKeys.challenges()], () => settleRoom(client, roomId, 'CANCELLED')),
    onError: (_error, _id, context) => {
      context?.rollback()
      toast.error(t('play.closeError'), { description: t('home.errorText') })
    },
  })
}
