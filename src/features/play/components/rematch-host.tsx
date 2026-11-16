import { optimisticUpdate } from '@/lib/optimistic-cache'
import { queryKeys } from '@/lib/query-keys'
import { settleChallenge } from '../lib/play-cache'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usePathname } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { RematchPrompt, toast, tokens, useTheme, useToastStore } from '@/design-system'
import { useMe } from '@/features/me'
import { usePersonalNotifications, type NotificationView } from '@/lib/realtime/personal-notifications'
import { rematchService, roomOfChallenge, useSecondsUntil } from '../hooks/use-rematch'
import { usePlayerAvatar, usePlayerPremium } from '@/features/social/hooks/use-player-avatar'
import { useT } from '@/lib/i18n'

/**
 * Demandes de revanche reçues (`CHALLENGE_RECEIVED` avec la partie d'origine) : `RematchPrompt` sur un voile, par
 * le flux personnel STOMP. Jamais pendant un duel (écrans immersifs, toasts suspendus) : la demande attend la fin s'il
 * reste du temps. Accepter ouvre la salle ; refuser, ou laisser filer le délai, ferme la proposition.
 */
export function RematchHost() {
  const t = useT()
  const { colors } = useTheme()
  const client = useQueryClient()
  const me = useMe(true)
  const immersive = useToastStore((state) => state.suspended > 0)
  const [requests, setRequests] = useState<NotificationView[]>([])
  const request = requests[0] ?? null
  const seconds = useSecondsUntil(request?.expiresAt ?? null)
  const opponent = useOpponent(request?.actorId ?? null, request?.sourceId ?? null)
  const opponentAvatar = usePlayerAvatar(request?.actorId ?? null)
  const opponentPremium = usePlayerPremium(request?.actorId ?? null)

  usePersonalNotifications(me.data?.userId, (notification, deleted) => {
    if (deleted) {
      setRequests((current) => current.filter((item) => item.notificationId !== notification.notificationId))
      return
    }
    if (notification.type === 'CHALLENGE_RECEIVED' && notification.gameId && notification.sourceId) {
      setRequests((current) => (current.some((item) => item.notificationId === notification.notificationId) ? current : [...current, notification]))
    }
  })

  const close = () => setRequests((current) => current.slice(1))
  // Délai écoulé : la proposition s'en va d'elle-même.
  useEffect(() => {
    if (request && request.expiresAt && seconds <= 0) close()
  }, [request, seconds])

  const pathname = usePathname()
  const accept = useMutation({
    mutationFn: (challengeId: string) => rematchService.accept(challengeId),
    onMutate: (id: string) => optimisticUpdate(client, [queryKeys.challenges()], () => settleChallenge(client, id, 'ACCEPTED')),
    onSuccess: (_result, challengeId) => {
      close()
      // Revanche acceptée depuis le résultat : la salle remplace la partie précédente, Quitter ne ramène pas à
      // l'ancien résultat (2026-11-16).
      const navigate = /^\/(duel|result)\//.test(pathname) ? router.replace : router.push
      navigate({
        pathname: '/room/[roomId]',
        params: { roomId: roomOfChallenge(challengeId), topicId: request?.topicId ?? '', topicName: opponent.topic, category: '' },
      })
    },
    onError: (_error, _id, context) => {
      context?.rollback()
      toast.error(t('mobile.rematch.unavailable'))
    },
  })

  const decline = useMutation({
    mutationFn: rematchService.decline,
    onMutate: (id: string) => optimisticUpdate(client, [queryKeys.challenges()], () => settleChallenge(client, id, 'DECLINED')),
    onSuccess: close,
    onError: (_error, _id, context) => {
      context?.rollback()
      toast.error(t('challenges.declineError'))
    },
  })

  if (!request || immersive || seconds <= 0) return null
  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        paddingHorizontal: tokens.space[5],
        backgroundColor: colors.scrim,
        zIndex: 50,
      }}
    >
      <RematchPrompt
        name={opponent.name}
        premium={opponentPremium}
        src={opponentAvatar}
        topic={opponent.topic}
        seconds={seconds}
        accepting={accept.isPending}
        declining={decline.isPending}
        onAccept={() => request.sourceId && accept.mutate(request.sourceId)}
        onDecline={() => {
          if (request.sourceId) decline.mutate(request.sourceId)
        }}
      />
    </View>
  )
}

/** Pseudonyme et sujet de la revanche, lus une fois sur le défi (la notification n'en porte que les identifiants). */
function useOpponent(actorId: string | null, challengeId: string | null) {
  const [info, setInfo] = useState({ name: 'Ton adversaire', topic: '' })
  useEffect(() => {
    if (!challengeId) return
    let active = true
    rematchService
      .get(challengeId)
      .then((view) => {
        if (!active) return
        const names = view.topic.names
        setInfo({ name: view.challenger.pseudonym, topic: names.fr ?? names.en ?? Object.values(names)[0] ?? '' })
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [actorId, challengeId])
  return info
}
