import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-keys'
import { optimisticUpdate, optimisticId } from '@/lib/optimistic-cache'
import { settleChallenge } from '../lib/play-cache'
import { router } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from '@/design-system'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import { usePersonalNotifications } from '@/lib/realtime/personal-notifications'
import { readServerNow } from '@/lib/realtime/server-clock'
import type { ChallengeView, IdResponse, MeView, PlayerProfileView } from '@joutio/client-domain/api-types'
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
 * Envoyer une revanche depuis le résultat : le défi apparaît optimistement, puis la réponse
 * arrive par le flux personnel STOMP — `ROOM_ACCEPTED` ou `CHALLENGE_DECLINED`. Aucun GET de confirmation.
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
  const client = useQueryClient()
  const [sending, setSending] = useState(false)
  const [state, setState] = useState<RematchState>('idle')
  const [challenge, setChallenge] = useState<{ id: string; expiresAt: string } | null>(null)
  const seconds = useSecondsUntil(challenge?.expiresAt ?? null)
  const settled = useRef(false)

  const accepted = (roomId: string) => {
    if (settled.current) return
    settled.current = true
    if (challenge) settleChallenge(client, challenge.id, 'ACCEPTED')
    toRoom(roomId, topic.topicId, topic.name, topic.category)
  }

  usePersonalNotifications(state === 'pending' ? userId : undefined, (notification) => {
    if (!challenge) return
    if (notification.type === 'ROOM_ACCEPTED' && notification.actorId === opponentId && notification.topicId === topic.topicId && notification.sourceId) {
      accepted(notification.sourceId)
    }
    if (notification.type === 'CHALLENGE_DECLINED' && notification.sourceId === challenge.id) {
      settled.current = true
      settleChallenge(client, challenge.id, 'DECLINED')
      setState('refused')
      setChallenge(null)
      toast.info('Revanche refusée')
    }
  })

  // The short expiry is a UI deadline; decisions arrive through STOMP, never a confirmation GET.
  useEffect(() => {
    if (state !== 'pending' || !challenge || seconds > 0 || settled.current) return
    settled.current = true
    settleChallenge(client, challenge.id, 'EXPIRED')
    setState('idle')
    setChallenge(null)
    toast.info('Pas de réponse', { description: 'Ton adversaire n’a pas répondu à temps.' })
  }, [client, state, challenge, seconds])

  const send = async () => {
    if (state !== 'idle' || !opponentId) return
    settled.current = false
    setState('pending')
    setSending(true)
    const tempId = optimisticId()
    const me = client.getQueryData<MeView>(queryKeys.me())
    const opponent = client.getQueryData<PlayerProfileView>(queryKeys.profiles.profile(opponentId))
    const transaction = await optimisticUpdate(client, [queryKeys.challenges()], () => {
      const pending: ChallengeView = {
        challengeId: tempId,
        topic: { topicId: topic.topicId, names: { fr: topic.name }, category: topic.category ?? null, imageUrl: null },
        challenger: { userId: userId ?? '', pseudonym: me?.pseudonym ?? '', avatarOptions: me?.avatarOptions ?? null, suspended: false },
        opponent: { userId: opponentId, pseudonym: opponent?.pseudonym ?? 'Adversaire', avatarOptions: opponent?.avatarOptions ?? null, suspended: false },
        status: 'PENDING',
        roomId: null,
        gameId,
        createdAt: new Date().toISOString(),
        expiresAt: '',
      }
      client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) => [pending, ...(items ?? [])])
    })
    try {
      const { id } = await rematchService.create(topic.topicId, opponentId, gameId)
      client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
        items?.map((item) => (item.challengeId === tempId ? { ...item, challengeId: id } : item)),
      )
      if (settled.current) return
      setChallenge({ id, expiresAt: new Date(readServerNow() + 10_000).toISOString() })
    } catch {
      transaction.rollback()
      setState('idle')
      toast.error("La revanche n'a pas pu être proposée", { description: 'Vérifie ta connexion, puis réessaie.' })
    } finally {
      setSending(false)
    }
  }

  return { state, seconds, send, sending }
}

/** Salle d'un défi accepté : le serveur la dérive du défi (`ChallengeRoomId.of`), on la calcule de même. */
export const roomOfChallenge = (challengeId: string) => nameUuid(`room:${challengeId}`)
