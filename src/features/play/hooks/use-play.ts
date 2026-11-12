import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { haptic, toast } from '@/design-system'
import { showQuotaDialog } from '@/features/challenges/lib/quota'
import { quotaProblemOf } from '@joutio/client-domain/premium'
import { useMe } from '@/features/me'
import { ENDPOINTS } from '@/lib/endpoints'
import { optimisticUpdate, optimisticId } from '@/lib/optimistic-cache'
import { queryKeys } from '@/lib/query-keys'
import { readServerNow } from '@/lib/realtime/server-clock'
import { subscribeStomp } from '@/lib/ws'
import { useNotificationStream } from '@/lib/realtime/use-notification-stream'
import { getItem, setItem } from '@/lib/storage'
import type { MeView, PeopleSort, ChallengeView } from '@joutio/client-domain/api-types'
import type { BotDifficulty } from '@joutio/client-domain/game'
import { applyMatchmakingNotification, emptyMatchmaking, type Matchmaking } from '@joutio/client-domain/rooms'
import type { MatchmakingNotification } from '@joutio/client-domain/rooms'
import { applyRoomNotification, emptyRoom, type Room } from '@joutio/client-domain/rooms'
import type { RoomView } from '@joutio/client-domain/rooms'
import type { RoomNotification } from '@joutio/client-domain/rooms'
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
    onMutate: (next: boolean) =>
      optimisticUpdate(client, [queryKeys.me()], () => client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, autoTrainOnTimeout: next } : me))),
    onError: (_error, _next, context) => {
      context?.rollback()
      toast.error("Le réglage n'a pas pu être enregistré")
    },
  })
  return { enabled, pending: mutation.isPending, set: (next: boolean) => mutation.mutate(next) }
}

/* ───────────────────────── Lancements ───────────────────────── */

const launchError = (title: string) => () => toast.error(title, { description: 'Vérifie ta connexion, puis réessaie.' })

/** Entraînement contre le robot : la salle bot se prépare, puis le duel s'ouvre. */
export function useStartTraining() {
  return useMutation({
    mutationFn: ({ topic, difficulty }: { topic: PlayTopic; difficulty: BotDifficulty }) => playService.createBotRoom(topic.topicId, difficulty),
    onSuccess: ({ id }, { topic }) => router.push({ pathname: '/room/[roomId]', params: { roomId: id, ...topicParams(topic) } }),
    // Salons bot : garde-fou anti-spam identique pour tous (P22), Premium n'y change rien.
    onError: (error) =>
      quotaProblemOf(error) === 'rooms'
        ? toast.error("Trop d'entraînements ouverts", { description: "Termine ou quitte un entraînement avant d'en lancer un autre." })
        : launchError("L'entraînement n'a pas pu démarrer")(),
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
  const client = useQueryClient()
  return useMutation({
    mutationFn: (topic: PlayTopic) => playService.createRoom(topic.topicId),
    onMutate: async (topic) => {
      const tempId = optimisticId()
      const transaction = await optimisticUpdate(client, [queryKeys.rooms()], () => {
        const room: RoomView = {
          roomId: tempId,
          topic: { topicId: topic.topicId, names: { fr: topic.name }, category: topic.category ?? null, imageUrl: null, pictogramUrl: null },
          status: 'WAITING_PLAYERS',
          vsBot: false,
          canCancel: true,
          opponent: null,
          initiatorPresent: false,
          participantPresent: false,
          gameId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          expiresAt: '',
        }
        client.setQueryData<RoomView[]>(queryKeys.rooms(), (rooms) => [...(rooms ?? []), room])
      })
      return { ...transaction, tempId }
    },
    onSuccess: ({ id }, topic, context) => {
      client.setQueryData<RoomView[]>(queryKeys.rooms(), (rooms) => rooms?.map((room) => (room.roomId === context.tempId ? { ...room, roomId: id } : room)))
      router.push({ pathname: '/room/[roomId]', params: { roomId: id, ...topicParams(topic) } })
    },
    onError: (error, _topic, context) => {
      context?.rollback()
      showQuotaDialog(error, client.getQueryData<MeView>(queryKeys.me())) || launchError("Le salon n'a pas pu être créé")()
    },
  })
}

/** Défi nominatif : envoyé, l'invité l'accepte depuis ses Défis. */
export function useChallengePlayer() {
  const client = useQueryClient()
  const me = useMe(true)
  return useMutation({
    mutationFn: ({ topic, opponent }: { topic: PlayTopic; opponent: { userId: string; pseudonym: string } }) =>
      playService.challenge(topic.topicId, opponent.userId),
    onMutate: async ({ topic, opponent }) => {
      const tempId = optimisticId()
      const transaction = await optimisticUpdate(client, [queryKeys.challenges()], () => {
        const challenge: ChallengeView = {
          challengeId: tempId,
          topic: { topicId: topic.topicId, names: { fr: topic.name }, category: topic.category ?? null, imageUrl: null, pictogramUrl: null },
          challenger: { userId: me.data?.userId ?? '', pseudonym: me.data?.pseudonym ?? '', avatarOptions: me.data?.avatarOptions ?? null, suspended: false },
          opponent: { ...opponent, avatarOptions: null, suspended: false },
          status: 'PENDING',
          roomId: null,
          gameId: null,
          createdAt: new Date().toISOString(),
          expiresAt: '',
        }
        client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) => [challenge, ...(items ?? [])])
      })
      return { ...transaction, tempId }
    },
    onSuccess: ({ id }, { topic, opponent }, context) => {
      client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
        items?.map((item) => (item.challengeId === context.tempId ? { ...item, challengeId: id } : item)),
      )
      toast.success('Défi envoyé', { description: `${opponent.pseudonym} · ${topic.name}` })
    },
    onError: (error, _variables, context) => {
      context?.rollback()
      showQuotaDialog(error, me.data) || launchError("Le défi n'a pas pu être envoyé")()
    },
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

type PresenceProblem = { type?: string; title?: string; detail?: string }

/**
 * Présence dans le salon tant que l'écran est monté (comme joutio-web, 2026-11-11) : l'app s'abonne au canal de
 * présence et le serveur en déduit l'entrée, la sortie (écran quitté) et la déconnexion (arrière-plan, réseau,
 * après une grâce). Rien n'est déclaré par l'app. Un refus d'entrée arrive sur la file personnelle ; `retry` se
 * réabonne.
 */
export function useRoomPresence(roomId: string) {
  const [attempt, setAttempt] = useState(0)
  const [failure, setFailure] = useState<{ attempt: number; problem: PresenceProblem } | null>(null)
  useEffect(() => {
    const offErrors = subscribeStomp(ENDPOINTS.rooms.presenceErrors, (message) => {
      try {
        const body = JSON.parse(message.body) as { roomId?: string; problem?: PresenceProblem }
        if (body.roomId === roomId) setFailure({ attempt, problem: body.problem ?? {} })
      } catch {
        // Trame illisible : ignorée.
      }
    })
    const offPresence = subscribeStomp(ENDPOINTS.rooms.presence(roomId), () => undefined)
    return () => {
      offPresence()
      offErrors()
    }
  }, [roomId, attempt])
  const current = failure?.attempt === attempt ? failure.problem : null
  return { failed: current !== null, problem: current, retry: () => setAttempt((value) => value + 1) }
}

/** Recherche en cours tant que l'écran est monté : le quitter (ou perdre la connexion) l'annule côté serveur. */
export function useTicketPresence(ticketId: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !ticketId) return
    return subscribeStomp(ENDPOINTS.matchmaking.presence(ticketId), () => undefined)
  }, [ticketId, enabled])
}

/** Relance de l'adversaire absent. */
export function useWizzRoom(roomId: string) {
  const [sentAt, setSentAt] = useState<number | null>(null)
  const mutation = useMutation({
    mutationFn: () => playService.wizzRoom(roomId),
    onMutate: () => {
      const previous = sentAt
      setSentAt(readServerNow())
      return { previous }
    },
    onError: (_error, _variables, context) => {
      setSentAt(context?.previous ?? null)
      toast.error("La relance n'a pas pu être envoyée")
    },
    onSuccess: () => haptic('light'),
  })
  return { ...mutation, sentAt }
}
