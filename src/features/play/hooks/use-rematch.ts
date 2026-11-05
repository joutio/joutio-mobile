import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from '@/design-system'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import { usePersonalNotifications } from '@/lib/realtime/personal-notifications'
import { readServerNow } from '@/lib/realtime/server-clock'
import type { ChallengeView, IdResponse } from '@/shared/types/bff'
import { nameUuid } from '@/shared/utils/name-uuid'

export const rematchService = {
  /** Revanche : défi nominatif portant la partie d'origine (TTL court côté serveur). */
  create: (topicId: string, opponentId: string, gameId: string) => api.post<IdResponse>(ENDPOINTS.challenges.create, { topicId, opponentId, gameId }),
  get: (challengeId: string) => api.get<ChallengeView>(ENDPOINTS.challenges.get(challengeId)),
  accept: (challengeId: string) => api.post<void>(ENDPOINTS.challenges.accept(challengeId)),
  decline: (challengeId: string) => api.post<void>(ENDPOINTS.challenges.decline(challengeId)),
}

const toRoom = (roomId: string, topicId: string, topicName: string, category?: string) =>
  router.replace({ pathname: '/room/[roomId]', params: { roomId, topicId, topicName, category: category ?? '' } })

/** Secondes restantes avant une échéance serveur, rafraîchies chaque seconde (horloge locale corrigée). */
export function useSecondsUntil(at: string | null) {
  const [now, setNow] = useState(readServerNow)
  useEffect(() => {
    if (!at) return
    const timer = setInterval(() => setNow(readServerNow()), 250)
    return () => clearInterval(timer)
  }, [at])
  return at ? Math.max(0, Math.ceil((Date.parse(at) - now) / 1000)) : 0
}

export type RematchState = 'idle' | 'pending' | 'refused'

/**
 * Envoyer une revanche depuis le résultat : le défi est créé, son échéance lue **une fois** (REST), puis la réponse
 * arrive par le flux personnel STOMP — `ROOM_ACCEPTED` (l'adversaire a accepté, la salle existe) ou
 * `CHALLENGE_DECLINED`. À l'échéance, une seule relecture du défi sert de filet (notifications désactivées).
 */
export function useSendRematch({
  userId,
  opponentId,
  topic,
  gameId,
}: {
  userId?: string
  opponentId: string | null
  topic: { topicId: string; name: string; category?: string }
  gameId: string
}) {
  const [state, setState] = useState<RematchState>('idle')
  const [challenge, setChallenge] = useState<{ id: string; expiresAt: string } | null>(null)
  const seconds = useSecondsUntil(challenge?.expiresAt ?? null)
  const settled = useRef(false)

  const accepted = (roomId: string) => {
    if (settled.current) return
    settled.current = true
    toRoom(roomId, topic.topicId, topic.name, topic.category)
  }

  usePersonalNotifications(state === 'pending' ? userId : undefined, (notification) => {
    if (!challenge) return
    if (notification.type === 'ROOM_ACCEPTED' && notification.actorId === opponentId && notification.topicId === topic.topicId && notification.sourceId) {
      accepted(notification.sourceId)
    }
    if (notification.type === 'CHALLENGE_DECLINED' && notification.sourceId === challenge.id) {
      settled.current = true
      setState('refused')
      setChallenge(null)
      toast.info('Revanche refusée')
    }
  })

  // Échéance : un seul contrôle du défi (filet si la notification n'est jamais arrivée).
  useEffect(() => {
    if (state !== 'pending' || !challenge || seconds > 0) return
    rematchService
      .get(challenge.id)
      .then((view) => {
        if (view.status === 'ACCEPTED' && view.roomId) return accepted(view.roomId)
        if (settled.current) return
        setState('idle')
        setChallenge(null)
        toast.info('Pas de réponse', { description: 'Ton adversaire n’a pas répondu à temps.' })
      })
      .catch(() => {
        setState('idle')
        setChallenge(null)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, challenge, seconds])

  const send = async () => {
    if (state !== 'idle' || !opponentId) return
    settled.current = false
    setState('pending')
    try {
      const { id } = await rematchService.create(topic.topicId, opponentId, gameId)
      const view = await rematchService.get(id)
      if (view.status === 'ACCEPTED' && view.roomId) return accepted(view.roomId)
      setChallenge({ id, expiresAt: view.expiresAt })
    } catch {
      setState('idle')
      toast.error("La revanche n'a pas pu être proposée", { description: 'Vérifie ta connexion, puis réessaie.' })
    }
  }

  return { state, seconds, send }
}

/** Salle d'un défi accepté : le serveur la dérive du défi (`ChallengeRoomId.of`), on la calcule de même. */
export const roomOfChallenge = (challengeId: string) => nameUuid(`room:${challengeId}`)
