import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import type { RoomView } from '@/features/play/domain/room'
import { roomOfChallenge } from '@/features/play/hooks/use-rematch'
import { queryKeys } from '@/lib/query-keys'
import { usePersonalNotifications } from '@/lib/realtime/personal-notifications'
import type { ChallengeView } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import { challengesService } from '../lib/challenges-service'

/** Défis du joueur (reçus et envoyés). */
export function useMyChallenges(enabled = true) {
  return useQuery({ queryKey: queryKeys.challenges(), queryFn: challengesService.mine, enabled, staleTime: 15_000 })
}

/** Salons du joueur. */
export function useMyRooms(enabled = true) {
  return useQuery({ queryKey: queryKeys.rooms(), queryFn: challengesService.rooms, enabled, staleTime: 15_000 })
}

/** Défis en attente, répartis : reçus (par échéance la plus proche) et envoyés. */
export function splitChallenges(challenges: readonly ChallengeView[] | undefined, userId: string) {
  const pending = (challenges ?? []).filter((challenge) => challenge.status === 'PENDING')
  const received = pending.filter((challenge) => challenge.opponent.userId === userId).sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt))
  const sent = pending.filter((challenge) => challenge.challenger.userId === userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
  return { received, sent }
}

/** Salons privés en attente d'un joueur : partagés par lien, ni robot ni défi nominatif. */
export const privateRooms = (rooms: readonly RoomView[] | undefined) =>
  (rooms ?? []).filter((room) => !room.vsBot && room.status === 'WAITING_PLAYERS' && room.canCancel && !room.opponent)

/**
 * Flux personnel STOMP : un défi reçu, refusé ou accepté rafraîchit les défis et les salons (aucun polling). Monté
 * une fois, dans le layout des onglets (badge de l'onglet Défis).
 */
export function useChallengesRealtime() {
  const client = useQueryClient()
  const userId = useMe(true).data?.userId
  usePersonalNotifications(userId, (notification) => {
    if (notification.type !== 'CHALLENGE_RECEIVED' && notification.type !== 'CHALLENGE_DECLINED' && notification.type !== 'ROOM_ACCEPTED') return
    void client.invalidateQueries({ queryKey: queryKeys.challenges() })
    void client.invalidateQueries({ queryKey: queryKeys.rooms() })
  })
}

/** Retire des défis de la liste en cache, restaurée si le BFF refuse. */
function useChallengeMutation(run: (ids: readonly string[]) => Promise<unknown>, error: string) {
  const client = useQueryClient()
  const key = queryKeys.challenges()
  return useMutation({
    mutationFn: run,
    onMutate: async (ids) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<ChallengeView[]>(key)
      if (previous)
        client.setQueryData<ChallengeView[]>(
          key,
          previous.filter((challenge) => !ids.includes(challenge.challengeId)),
        )
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      toast.error(error, { description: 'Vérifie ta connexion, puis réessaie.' })
    },
    onSettled: () => void client.invalidateQueries({ queryKey: key }),
  })
}

export const useDeclineChallenges = () =>
  // « Tout refuser » : pas d'endpoint groupé, un `/decline` par défi (`defis.md` § 5).
  useChallengeMutation(async (ids) => {
    const results = await Promise.allSettled(ids.map((id) => challengesService.decline(id)))
    if (results.some((result) => result.status === 'rejected')) throw new Error('decline')
  }, "Le refus n'a pas pu être envoyé")

export const useCancelChallenge = () =>
  useChallengeMutation((ids) => Promise.all(ids.map((id) => challengesService.cancel(id))), "Le défi n'a pas pu être annulé")

/** Accepter : la salle du défi est calculée comme le serveur, puis ouverte. */
export function useAcceptChallenge() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (challenge: ChallengeView) => challengesService.accept(challenge.challengeId),
    onSuccess: (_result, challenge) => {
      void client.invalidateQueries({ queryKey: queryKeys.challenges() })
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
    onError: () => {
      void client.invalidateQueries({ queryKey: queryKeys.challenges() })
      toast.error("Ce défi n'est plus disponible")
    },
  })
}

/** Fermer un salon privé. */
export function useCloseRoom() {
  const client = useQueryClient()
  const key = queryKeys.rooms()
  return useMutation({
    mutationFn: (roomId: string) => challengesService.cancelRoom(roomId),
    onMutate: async (roomId) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<RoomView[]>(key)
      if (previous)
        client.setQueryData<RoomView[]>(
          key,
          previous.filter((room) => room.roomId !== roomId),
        )
      return { previous }
    },
    onError: (_error, _roomId, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      toast.error("Le salon n'a pas pu être fermé")
    },
  })
}
