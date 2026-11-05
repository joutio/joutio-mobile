import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useEffect } from 'react'
import { create } from 'zustand'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { ENDPOINTS } from '@/lib/endpoints'
import { queryKeys } from '@/lib/query-keys'
import { useNotificationStream } from '@/lib/realtime/use-notification-stream'
import { getItem, setItem } from '@/lib/storage'
import type { MeView, PeopleSort } from '@/shared/types/bff'
import type { BotDifficulty } from '@/features/duel/domain/game-dto'
import { applyMatchmakingNotification, emptyMatchmaking, type Matchmaking } from '../domain/matchmaking'
import type { MatchmakingNotification } from '../domain/matchmaking-notification'
import { applyRoomNotification, emptyRoom, type Room } from '../domain/room'
import type { RoomNotification } from '../domain/room-notification'
import { CONTACTS_PAGE_SIZE, playService } from '../lib/play-service'

/** Contexte du sujet passé d'écran en écran : l'en-tête s'affiche sans attendre le serveur. */
export interface PlayTopic {
  topicId: string
  name: string
  category?: string
}

const topicParams = (topic: PlayTopic) => ({ topicId: topic.topicId, topicName: topic.name, category: topic.category ?? '' })

/* ───────────────────────── Difficulté du robot (mémoire locale à l'appareil) ───────────────────────── */

const DIFFICULTY_KEY = 'joutio.botDifficulty'
const DIFFICULTIES: BotDifficulty[] = ['EASY', 'NORMAL', 'HARD']

interface DifficultyState {
  difficulty: BotDifficulty
  set: (difficulty: BotDifficulty) => void
}

export const useBotDifficulty = create<DifficultyState>((set) => ({
  difficulty: 'NORMAL',
  set: (difficulty) => {
    set({ difficulty })
    void setItem(DIFFICULTY_KEY, difficulty)
  },
}))

void getItem(DIFFICULTY_KEY).then((stored) => {
  if (stored && DIFFICULTIES.includes(stored as BotDifficulty)) useBotDifficulty.setState({ difficulty: stored as BotDifficulty })
})

/* ───────────────────────── Préférence « entraînement si aucun adversaire » (profil) ───────────────────────── */

/** `true` par défaut, y compris tant que le BFF n'expose pas encore le champ. */
export function useAutoTrain() {
  const me = useMe(true)
  const client = useQueryClient()
  const enabled = me.data?.autoTrainOnTimeout ?? true
  const mutation = useMutation({
    mutationFn: (next: boolean) => playService.setAutoTrain(me.data?.userId ?? '', next),
    onMutate: (next) => {
      const previous = client.getQueryData<MeView>(queryKeys.me())
      if (previous) client.setQueryData<MeView>(queryKeys.me(), { ...previous, autoTrainOnTimeout: next })
      return { previous }
    },
    onError: (_error, _next, context) => {
      if (context?.previous) client.setQueryData(queryKeys.me(), context.previous)
      toast.error("Le réglage n'a pas pu être enregistré", { description: 'Vérifie ta connexion, puis réessaie.' })
    },
  })
  return { enabled, set: (next: boolean) => mutation.mutate(next) }
}

/* ───────────────────────── Lancements ───────────────────────── */

const launchError = (title: string) => () => toast.error(title, { description: 'Vérifie ta connexion, puis réessaie.' })

/** Entraînement contre le robot : la salle bot se prépare, puis le duel s'ouvre. */
export function useStartTraining() {
  return useMutation({
    mutationFn: ({ topic, difficulty }: { topic: PlayTopic; difficulty: BotDifficulty }) => playService.createBotRoom(topic.topicId, difficulty),
    onSuccess: ({ id }, { topic }) => router.push({ pathname: '/room/[roomId]', params: { roomId: id, ...topicParams(topic) } }),
    onError: launchError("L'entraînement n'a pas pu démarrer"),
  })
}

/** « Défier le monde » : ticket d'appariement, puis l'écran de recherche. */
export function useStartMatchmaking() {
  return useMutation({
    mutationFn: (topic: PlayTopic) => playService.enqueue(topic.topicId),
    onSuccess: (ticket, topic) => router.push({ pathname: '/matchmaking/[ticketId]', params: { ticketId: ticket.ticketId, ...topicParams(topic) } }),
    onError: launchError("La recherche n'a pas pu démarrer"),
  })
}

/** Salon privé à partager par lien. */
export function useCreatePrivateRoom() {
  return useMutation({
    mutationFn: (topic: PlayTopic) => playService.createRoom(topic.topicId),
    onSuccess: ({ id }, topic) => router.push({ pathname: '/room/[roomId]', params: { roomId: id, ...topicParams(topic) } }),
    onError: launchError("Le salon n'a pas pu être créé"),
  })
}

/** Défi nominatif : envoyé, l'invité l'accepte depuis ses Défis. */
export function useChallengePlayer() {
  return useMutation({
    mutationFn: ({ topic, opponent }: { topic: PlayTopic; opponent: { userId: string; pseudonym: string } }) =>
      playService.challenge(topic.topicId, opponent.userId),
    onSuccess: (_result, { topic, opponent }) => toast.success('Défi envoyé', { description: `${opponent.pseudonym} · ${topic.name}` }),
    onError: launchError("Le défi n'a pas pu être envoyé"),
  })
}

/* ───────────────────────── Contacts (Défier un joueur) ───────────────────────── */

export function useContacts(direction: 'following' | 'followers', query: string, enabled: boolean, sort: PeopleSort = 'RECENT') {
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  return useInfiniteQuery({
    queryKey: ['contacts', userId, direction, query, sort],
    queryFn: ({ pageParam }) => playService.contacts(userId, direction, query, sort, pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
    meta: { pageSize: CONTACTS_PAGE_SIZE },
  })
}

/* ───────────────────────── Temps réel ───────────────────────── */

/** Salle : vue REST (sujet, adversaire) et état replié des notifications (REST à l'ouverture, puis STOMP). */
export function useRoom(roomId: string) {
  const view = useQuery({ queryKey: ['rooms', roomId], queryFn: () => playService.room(roomId), staleTime: Infinity, retry: 2 })
  const stream = useNotificationStream<RoomNotification, Room>(
    roomId
      ? {
          aggregateId: roomId,
          topic: ENDPOINTS.rooms.topic(roomId),
          initial: emptyRoom,
          load: playService.roomNotifications,
          apply: applyRoomNotification,
          notFoundGraceMs: 5_000,
        }
      : null,
  )
  return { view, room: stream.state, status: stream.status }
}

/** Ticket d'appariement, replié de ses notifications. */
export function useTicket(ticketId: string) {
  return useNotificationStream<MatchmakingNotification, Matchmaking>(
    ticketId
      ? {
          aggregateId: ticketId,
          topic: ENDPOINTS.matchmaking.topic(ticketId),
          initial: emptyMatchmaking,
          load: playService.ticketNotifications,
          apply: applyMatchmakingNotification,
          notFoundGraceMs: 5_000,
        }
      : null,
  )
}

/** Présence dans la salle tant que l'écran est monté (idempotent côté serveur). */
export function useRoomPresence(roomId: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    playService.joinRoom(roomId).catch(() => undefined)
  }, [roomId, enabled])
}
