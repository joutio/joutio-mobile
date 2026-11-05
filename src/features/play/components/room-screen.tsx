import * as Clipboard from 'expo-clipboard'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Share, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Button,
  EmptyState,
  ForceDark,
  haptic,
  InviteCard,
  LinkIcon,
  Pill,
  ReconnectCountdown,
  RoomPlayers,
  ShareNetworkIcon,
  SplashLogo,
  Text,
  tokens,
  useTheme,
  WarningCircleIcon,
} from '@/design-system'
import { useMe } from '@/features/me'
import { config } from '@/lib/config'
import { readServerNow, useServerClock } from '@/lib/realtime/server-clock'
import { useConnectionStore } from '@/lib/ws'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { PREPARATION_STEPS, preparationStep } from '../domain/room'
import { useRoom, useRoomPresence } from '../hooks/use-play'
import { playService } from '../lib/play-service'

export interface RoomRouteParams {
  roomId: string
  topicId?: string
  topicName?: string
  category?: string
  [key: string]: string | undefined
}

const TERMINAL = { CANCELLED: 'Le salon a été fermé', EXPIRED: 'Le salon a expiré', FAILED: "Le duel n'a pas pu être préparé" } as const

/** Lien public du salon (`joutio-landing` `/join/{roomId}` ouvre l'app). */
export const roomLink = (roomId: string) => `${config.siteUrl}/join/${roomId}`

function useCountdown(expiresAt: string | null) {
  const [now, setNow] = useState(readServerNow)
  useEffect(() => {
    const timer = setInterval(() => setNow(readServerNow()), 1000)
    return () => clearInterval(timer)
  }, [])
  if (!expiresAt) return null
  const left = Math.max(0, Math.round((Date.parse(expiresAt) - now) / 1000))
  // Au-delà d'une heure (salon de 24 h) : heures et minutes ; dans la dernière heure : minutes et secondes.
  if (left >= 3600) return `${Math.floor(left / 3600)} h ${String(Math.floor((left % 3600) / 60)).padStart(2, '0')}`
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}

/**
 * Salle d'une partie (`defis.md` § 2, `lancer-partie.md`) : salon privé à partager (lien, QR code) tant que le
 * second joueur manque, puis préparation (profils, questions, création) et bascule vers le duel. Salle bot, défi
 * accepté et appariement public passent par la même préparation.
 */
export function RoomScreen() {
  const params = useLocalSearchParams<RoomRouteParams>()
  const roomId = params.roomId
  useServerClock()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const { view, room, status } = useRoom(roomId)
  const connection = useConnectionStore((state) => state.status)
  const [copied, setCopied] = useState(false)
  useRoomPresence(roomId, true)

  const topic = view.data ? topicName(view.data.topic.names) : (params.topicName ?? '')
  const category = view.data?.topic.category ?? params.category
  const topicId = view.data?.topic.topicId ?? params.topicId
  const gameId = room?.gameId ?? view.data?.gameId ?? null
  const roomStatus = room?.status ?? view.data?.status ?? 'WAITING_PLAYERS'
  const isInitiator = room?.initiatorId ? room.initiatorId === userId : (view.data?.canCancel ?? false)
  const shared = room ? !room.vsBot && room.opponentId === null : false
  const countdown = useCountdown(room?.expiresAt ?? view.data?.expiresAt ?? null)

  // La partie est créée : le duel remplace la salle (le retour ramène à l'écran d'avant).
  const done = useRef(false)
  useEffect(() => {
    if (!gameId || done.current) return
    done.current = true
    router.replace({ pathname: '/duel/[gameId]', params: { gameId, topicName: topic, category: category ?? '', topicId: topicId ?? '' } })
  }, [gameId, topic, category, topicId])

  // Quitter l'écran avant la partie : l'hôte ferme le salon, l'invité le quitte.
  useEffect(
    () => () => {
      if (done.current) return
      const action = isInitiator ? playService.cancelRoom : playService.leaveRoom
      action(roomId).catch(() => undefined)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roomId],
  )

  const close = () => router.back()

  if (roomStatus in TERMINAL) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: tokens.space[5], backgroundColor: colors.bg }}>
        <EmptyState
          icon={WarningCircleIcon}
          title={TERMINAL[roomStatus as keyof typeof TERMINAL]}
          description="Relance un duel depuis la fiche du sujet."
          action={
            <Button style={{ alignSelf: 'center' }} onPress={close}>
              Retour
            </Button>
          }
        />
      </View>
    )
  }

  const opponentPresent = room ? (isInitiator ? room.participantPresent : room.initiatorPresent) : false
  const opponentName = view.data?.opponent?.pseudonym ?? undefined
  const waitingForPlayer = shared && roomStatus === 'WAITING_PLAYERS'

  // Préparation (bot, appariement, défi, ou salon complet) : sombre, comme le duel qui suit.
  if (!waitingForPlayer) {
    const step = preparationStep(roomStatus)
    return (
      <ForceDark>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space[6], padding: tokens.space[5], backgroundColor: colors.bg }}>
          <SplashLogo variant="loading" />
          <View style={{ alignItems: 'center', gap: tokens.space[2] }}>
            <Text variant="headline">{topic}</Text>
            <Text variant="callout" color="muted" accessibilityLiveRegion="polite">
              {roomStatus === 'WAITING_PLAYERS' && !room?.vsBot
                ? opponentName
                  ? `En attente de ${opponentName}`
                  : "En attente de l'adversaire"
                : (PREPARATION_STEPS[step]?.label ?? 'Préparation du duel…')}
            </Text>
          </View>
          <Button variant="plain" tone="neutral" style={{ alignSelf: 'center' }} onPress={close}>
            Annuler
          </Button>
          {connection === 'reconnecting' && <ReconnectCountdown onLeave={close} leaveLabel="Quitter" />}
        </View>
      </ForceDark>
    )
  }

  const link = roomLink(roomId)
  const myName = me.data?.pseudonym ?? ''
  const myTier = me.data?.progression && !me.data.progression.provisional ? tierOf(me.data.progression.rating) : undefined
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top + tokens.space[5], paddingBottom: insets.bottom + tokens.space[5] }}>
      <View style={{ flex: 1, gap: tokens.space[6], paddingHorizontal: tokens.space[5] }}>
        <View style={{ alignItems: 'center', gap: tokens.space[3] }}>
          <Pill icon={LinkIcon} style={{ alignSelf: 'center' }}>
            Salon privé
          </Pill>
          <Text variant="title1" align="center" accessibilityRole="header">
            {topic}
          </Text>
          {countdown && (
            <Text variant="callout" color="muted" accessibilityLabel={`Le salon expire dans ${countdown}`}>
              Expire dans{' '}
              <Text variant="callout" mono color="muted">
                {countdown}
              </Text>
            </Text>
          )}
        </View>
        <RoomPlayers me={{ name: myName, tier: myTier }} opponent={opponentPresent && opponentName ? { name: opponentName } : undefined} />
        <InviteCard
          url={link}
          copied={copied}
          onCopy={() => {
            void Clipboard.setStringAsync(link)
            haptic('success')
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        />
        <Button full icon={ShareNetworkIcon} variant="tinted" onPress={() => void Share.share({ message: `Viens me défier sur Joutio : ${topic}\n${link}` })}>
          Partager le lien
        </Button>
      </View>
      <View style={{ paddingHorizontal: tokens.space[5] }}>
        <Button full size="L" variant="tinted" tone="destructive" onPress={close}>
          {isInitiator ? 'Fermer le salon' : 'Quitter le salon'}
        </Button>
      </View>
      {connection === 'reconnecting' && <ReconnectCountdown onLeave={close} leaveLabel="Quitter le salon" />}
      {status?.terminalError && (
        <View
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, justifyContent: 'center', padding: tokens.space[5], backgroundColor: colors.bg }}
        >
          <EmptyState
            icon={WarningCircleIcon}
            title="Salon introuvable"
            description="Il a peut-être expiré."
            action={
              <Button style={{ alignSelf: 'center' }} onPress={close}>
                Retour
              </Button>
            }
          />
        </View>
      )}
    </View>
  )
}
