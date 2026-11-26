import { useState } from 'react'
import { create } from 'zustand'
import { useSubscription } from '@joutio/client/core/realtime'
import type { BotDifficulty } from '@joutio/client/game'
import { useMe, useSetAutoTrain } from '@joutio/client/me'
import { quotaProblemOf } from '@joutio/client/premium'
import {
  useCreateBotRoom,
  useCreateChallenge,
  useCreateRoom,
  useEnqueueMatchmaking,
  useJoinRefusal,
  useMatchmakingStream,
  useRoom as useRoomView,
  useRoomStream,
  type JoinRefusal,
} from '@joutio/client/rooms'
import { toast } from '@/design-system'
import { showQuotaDialog } from '@/features/challenges/lib/quota'
import { ENDPOINTS } from '@/lib/endpoints'
import { getItem, setItem } from '@/lib/storage'
import { router } from '@/shared/navigation/router'
import { t } from '@/lib/i18n'

/** Contexte du sujet passé d'écran en écran : l'en-tête s'affiche sans attendre le serveur. */
export interface PlayTopic {
  topicId: string
  name: string
  category?: string
}

/** Suite donnée par l'écran appelant (fermer une feuille) une fois la commande acceptée. */
interface Then {
  onSuccess?: () => void
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

/** `true` par défaut ; mutation optimiste de la lib (`useSetAutoTrain`), un refus s'affiche en toast. */
export function useAutoTrain() {
  const me = useMe()
  const command = useSetAutoTrain(me.data?.userId ?? '')
  return {
    enabled: me.data?.autoTrainOnTimeout ?? true,
    pending: command.isPending,
    set: (next: boolean) => command.mutate(next, { onError: () => toast.error(t('play.settingError')) }),
  }
}

/* ───────────────────────── Lancements ───────────────────────── */

const launchError = (title: string) => toast.error(title, { description: t('home.errorText') })

/** Échec de création d'un salon bot : garde-fou anti-spam identique pour tous (P22), Premium n'y change rien. */
export const botRoomError = (error: unknown) =>
  quotaProblemOf(error) === 'rooms' ? toast.error(t('play.botQuotaError'), { description: t('play.botQuotaText') }) : launchError(t('play.trainingError'))

/** Ouvre le salon d'un sujet (paramètres d'en-tête passés, l'écran s'affiche sans attendre le serveur). */
export const openRoom = (roomId: string, topic: PlayTopic) => router.push({ pathname: '/room/[roomId]', params: { roomId, ...topicParams(topic) } })

/** Entraînement contre le robot : la salle bot se prépare, puis le duel s'ouvre. */
export function useStartTraining() {
  const create = useCreateBotRoom()
  return {
    isPending: create.isPending,
    mutate: ({ topic, difficulty }: { topic: PlayTopic; difficulty: BotDifficulty }, then?: Then) =>
      create.mutate(
        { topicId: topic.topicId, difficulty },
        {
          onSuccess: ({ id }) => {
            then?.onSuccess?.()
            openRoom(id, topic)
          },
          onError: botRoomError,
        },
      ),
  }
}

/** « Défier le monde » : ticket d'appariement, puis l'écran de recherche. */
export function useStartMatchmaking() {
  const enqueue = useEnqueueMatchmaking()
  return {
    isPending: enqueue.isPending,
    mutate: (topic: PlayTopic, then?: Then) =>
      enqueue.mutate(topic.topicId, {
        onSuccess: (ticket) => {
          then?.onSuccess?.()
          router.push({ pathname: '/matchmaking/[ticketId]', params: { ticketId: ticket.ticketId, ...topicParams(topic) } })
        },
        onError: () => launchError(t('play.matchmakingError')),
      }),
  }
}

/** Salon privé à partager par lien : il s'ouvre dès que le serveur renvoie son `id`. */
export function useCreatePrivateRoom() {
  const me = useMe()
  const create = useCreateRoom()
  return {
    isPending: create.isPending,
    mutate: (topic: PlayTopic, then?: Then) =>
      create.mutate(
        { topicId: topic.topicId },
        {
          onSuccess: ({ id }) => {
            then?.onSuccess?.()
            openRoom(id, topic)
          },
          onError: (error) => showQuotaDialog(error, me.data) || launchError(t('play.roomError')),
        },
      ),
  }
}

/**
 * Défi nominatif : une salle `INVITED`, que l'invité accepte depuis ses Défis. Elle rejoint les défis envoyés par la
 * vue vivante `my-rooms`.
 */
export function useChallengePlayer() {
  const me = useMe()
  const create = useCreateChallenge()
  return {
    isPending: create.isPending,
    opponentId: create.isPending ? create.variables?.opponentId : undefined,
    mutate: ({ topic, opponent }: { topic: PlayTopic; opponent: { userId: string; pseudonym: string } }, then?: Then) =>
      create.mutate(
        { topicId: topic.topicId, opponentId: opponent.userId },
        {
          onSuccess: () => {
            then?.onSuccess?.()
            toast.success(t('play.challengeSent'), { description: t('common.dotPair', { a: opponent.pseudonym, b: topic.name }) })
          },
          onError: (error) => showQuotaDialog(error, me.data) || launchError(t('play.challengeError')),
        },
      ),
  }
}

/* ───────────────────────── Temps réel ───────────────────────── */

/** Salle : vue REST (sujet, adversaire) et salle repliée de ses événements (REST à l'ouverture, puis STOMP). */
export function useRoom(roomId: string) {
  const view = useRoomView(roomId)
  const stream = useRoomStream(roomId)
  return { view, room: stream.state, status: stream.status }
}

/** Ticket d'appariement, replié de ses événements. */
export const useTicket = (ticketId: string) => useMatchmakingStream(ticketId)

/** Abonnement sans message : seul le serveur en déduit quelque chose (canal de présence). */
const silent = () => undefined

/**
 * Présence dans le salon tant que l'écran est monté (comme joutio-web, 2026-11-11) : l'écran rend
 * `RoomPresenceChannel` (abonnement au canal de présence) et le serveur en déduit l'entrée, la sortie (écran quitté)
 * et la déconnexion (arrière-plan, réseau, après une grâce). Rien n'est déclaré par l'app. Un refus d'entrée arrive
 * sur la file personnelle (`useJoinRefusal`) ; `retry` remonte le canal (`attempt` sert de clé).
 */
export function useRoomPresence(roomId: string) {
  const [refusal, setRefusal] = useState<JoinRefusal | null>(null)
  const [attempt, setAttempt] = useState(0)
  useJoinRefusal(roomId, setRefusal)
  return {
    refusal,
    attempt,
    retry: () => {
      setRefusal(null)
      setAttempt((value) => value + 1)
    },
  }
}

/** Canal de présence d'un salon : abonné = dans le salon. À rendre avec `key={attempt}` (`useRoomPresence`). */
export function RoomPresenceChannel({ roomId }: { roomId: string }) {
  useSubscription(ENDPOINTS.rooms.presence(roomId), silent, silent)
  return null
}

/** Recherche en cours tant que l'écran est monté : le quitter (ou perdre la connexion) l'annule côté serveur. */
export function useTicketPresence(ticketId: string, enabled: boolean) {
  useSubscription(enabled ? ENDPOINTS.matchmaking.presence(ticketId) : undefined, silent, silent)
}
