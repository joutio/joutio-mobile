import { buildShareUrl } from '@joutio/client/core/share'
import { useShare } from '@/features/share'
import {
  haptic,
  toast,
  Button,
  EmptyState,
  LightningIcon,
  LinkIcon,
  Pill,
  PreparationSteps,
  RobotIcon,
  RoomPlayers,
  Screen,
  MobileTopBar,
  ShareNetworkIcon,
  SwordIcon,
  Text,
  tokens,
  useTheme,
  WarningCircleIcon,
  type RoomPlayer,
} from '@/design-system'
import { useLocalSearchParams, useIsFocused } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useMe } from '@joutio/client/me'
import { useProfile } from '@joutio/client/profile'
import { usePlayerIdentity } from '@/features/me'
import { useServerClock } from '@/lib/realtime/server-clock'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import {
  PREPARATION_STEPS,
  preparationComplete,
  preparationStep,
  Room,
  useCancelRooms,
  useRemindRoom,
  waitingStatusLabel,
  type JoinRefusal,
  type RoomFailureKind,
} from '@joutio/client/rooms'
import { RoomPresenceChannel, useRoom, useRoomPresence } from '../hooks/use-play'
import { userAvatar } from '@/shared/utils/avatar'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { countdownOf, useServerNow } from '../lib/countdown'
import { t, useT } from '@/lib/i18n'

export interface RoomRouteParams {
  roomId: string
  topicId?: string
  topicName?: string
  category?: string
  [key: string]: string | undefined
}

/** Libellé traduit de chaque étape de `PREPARATION_STEPS` (les libellés de la lib restent le français du lab). */
const STEP_LABEL = { players: 'room.stepPlayers', profiles: 'room.stepProfiles', questions: 'room.stepQuestions', launch: 'room.stepLaunch' } as const

const TERMINAL = () =>
  ({
    CANCELLED: { title: t('room.cancelledTitle'), description: t('room.cancelledText') },
    EXPIRED: { title: t('room.expiredTitle'), description: t('room.expiredText') },
    FAILED: { title: t('room.failedTitle'), description: t('room.failedText') },
  }) as const

/** Explication d'un échec selon le motif serveur (`ROOM_FAILED.reason`) ; repli générique. */
const FAILURE_DESCRIPTION = (): Record<RoomFailureKind, string> => ({
  language: t('room.failedLanguageText'),
  topic: t('room.failedTopicText'),
  timeout: t('room.failedTimeoutText'),
  unknown: TERMINAL().FAILED.description,
})

/**
 * Refus d'entrée (`useJoinRefusal`). La lib n'a pas encore de texte par refus : les messages existants les plus
 * proches servent.
 */
const REFUSAL = (): Record<JoinRefusal, string> => ({
  FULL: t('join.unavailableText'),
  NOT_INVITED: t('room.presenceError'),
  UNAVAILABLE: t('room.presenceError'),
  GONE: t('room.notFoundText'),
})

/** Lien universel du salon (`partage.md` § 2). */
export const roomLink = (roomId: string) => buildShareUrl({ kind: 'room', id: roomId })

/**
 * Salon de préparation (`defis.md` § 2, `lancer-partie.md`, 2026-11-07 à l'image de joutio-web) : **un seul écran pour
 * toute salle** — salon partagé, défi nominatif, bot ou appariement. Face-à-face avec la présence de chacun, étapes de
 * préparation, décompte d'expiration ; partage du lien pour un salon partagé ; relance (« wizz ») de l'adversaire
 * nommé absent ; annulation par l'initiateur. Tant que les joueurs ne sont pas là, le retour quitte le salon sans le
 * fermer ; la préparation continue après le retour, suivie par le bandeau global.
 */
export function RoomScreen() {
  const t = useT()
  const identity = usePlayerIdentity()
  const params = useLocalSearchParams<RoomRouteParams>()
  const roomId = params.roomId
  useServerClock()
  const me = useMe()
  const myAvatar = useMyAvatar()
  const userId = me.data?.userId ?? ''
  const { view, room, status } = useRoom(roomId)
  const presence = useRoomPresence(roomId)
  const wizz = useRemindRoom()
  const cancellation = useCancelRooms()
  const now = useServerNow()
  const focused = useIsFocused()

  const topic = view.data ? topicName(view.data.topic.names) : (params.topicName ?? '')
  const category = view.data?.topic.category ?? params.category
  const topicId = view.data?.topic.topicId ?? params.topicId
  const gameId = room?.gameId ?? view.data?.gameId ?? null
  const roomStatus = room?.status ?? view.data?.status ?? 'WAITING_PLAYERS'
  const vsBot = room?.vsBot ?? view.data?.vsBot ?? false
  const isInitiator = room?.initiatorId ? room.initiatorId === userId : (view.data?.canCancel ?? false)
  // Salle nominative : l'adversaire est connu dès la création (défi, appariement) ; partagée : il arrive par le lien.
  const nominative = Boolean(room?.opponentId)
  const shared = !vsBot && !nominative
  const waiting = roomStatus === 'WAITING_PLAYERS'
  const engaged = !waiting && !(roomStatus in TERMINAL())

  const opponentId = vsBot ? null : isInitiator ? (room?.opponentId ?? room?.participantId ?? null) : (room?.initiatorId ?? null)
  // La vue REST ne connaît pas le second joueur d'un salon partagé arrivé après coup : son profil est lu à part.
  const fetched = useProfile(opponentId && !view.data?.opponent ? opponentId : undefined)
  const opponentView = view.data?.opponent ?? null
  const opponentName = vsBot ? t('topic.bot') : (opponentView?.pseudonym ?? fetched.data?.pseudonym)
  const myPresent = room ? (isInitiator ? room.initiatorPresent : room.participantPresent) : false
  const opponentPresent = vsBot ? true : room ? (isInitiator ? room.participantPresent : room.initiatorPresent) : false
  const countdown = waiting ? countdownOf(room?.expiresAt ?? view.data?.expiresAt ?? null, now) : null
  // Relance de l'adversaire absent : la cadence vient du flux de la salle (`ROOM_REMINDED`).
  const wizzInfo = room ? room.reminderState(userId || null, now) : { available: false, cooldownEndsAt: null }
  const wizzSeconds = wizzInfo.cooldownEndsAt ? Math.max(0, Math.ceil((wizzInfo.cooldownEndsAt - now) / 1000)) : 0
  const wizzVisible = nominative && waiting && (wizzInfo.available || wizz.isPending || wizzSeconds > 0)

  // La partie est créée : le duel remplace la salle (le retour ramène à l'écran d'avant).
  const done = useRef(false)
  useEffect(() => {
    if (!focused || !gameId || done.current) return
    done.current = true
    router.replace({ pathname: '/duel/[gameId]', params: { gameId, topicName: topic, category: category ?? '', topicId: topicId ?? '' } })
  }, [focused, gameId, topic, category, topicId])

  // Quitter l'écran, passer en arrière-plan ou perdre le réseau : le serveur le constate (canal de présence).

  // L'annulation est une intention : la commande part et l'écran se ferme aussitôt.
  const cancel = () => {
    cancellation.mutate([roomId], { onError: () => toast.error(t('play.closeError'), { description: t('home.errorText') }) })
    router.back()
  }
  const remind = () =>
    wizz.mutate(roomId, {
      onSuccess: () => haptic('light'),
      onError: () => toast.error(t('play.wizzError')),
    })
  useEffect(() => {
    if (params.fromPush === '1' && (roomStatus in TERMINAL() || status?.notFound)) {
      toast.info(t('mobile.room.unavailable'))
      router.replace('/challenges')
    }
  }, [params.fromPush, roomStatus, status?.notFound])
  const close = () => router.back()
  // Avant tout `return` : l'écran terminal (salon fermé, expiré) ne doit pas sauter de hook (2026-11-14).
  const shareLink = useShare()

  if (roomStatus in TERMINAL() || status?.notFound) {
    const copy =
      status?.notFound && !(roomStatus in TERMINAL())
        ? { title: t('room.notFoundTitle'), description: t('room.notFoundText') }
        : roomStatus === 'FAILED'
          ? { title: TERMINAL().FAILED.title, description: FAILURE_DESCRIPTION()[Room.failureKind(room?.failureReason)] }
          : TERMINAL()[roomStatus as keyof ReturnType<typeof TERMINAL>]
    return (
      <Screen header={<MobileTopBar variant="inline" back={t('topic.back')} title={t('room.title')} onBack={close} />} scroll={false}>
        <Terminal title={copy.title} description={copy.description} onBack={close} />
      </Screen>
    )
  }

  const myName = me.data?.pseudonym ?? ''
  const myTier = me.data?.progression ? tierOf(me.data.progression.rating) : undefined
  const meSeat: RoomPlayer = {
    name: myName,
    src: myAvatar,
    tier: myTier,
    premium: identity.myPremium,
    away: !myPresent,
    status: myPresent ? t('room.inRoom') : t('callback.loading'),
  }
  const opponentSeat: RoomPlayer | undefined = vsBot
    ? { name: 'Robot', status: 'Prêt' }
    : opponentId
      ? {
          name: opponentName ?? t('topic.opponent'),
          premium: identity.premium(opponentView ?? fetched.data, opponentId),
          src: userAvatar(opponentView ?? fetched.data ?? undefined),
          tier: opponentView?.rating != null ? tierOf(opponentView.rating) : undefined,
          away: !opponentPresent,
        }
      : undefined
  const step = preparationStep(roomStatus)
  const detail = waiting
    ? waitingStatusLabel({ playerPresent: myPresent, opponentPresent: opponentPresent && Boolean(opponentSeat), opponentLabel: opponentName ?? null })
    : undefined
  const kind = vsBot
    ? { icon: RobotIcon, label: t('room.training') }
    : nominative
      ? { icon: SwordIcon, label: t('room.challenge') }
      : { icon: LinkIcon, label: t('room.private') }
  const cancelLabel = vsBot ? t('room.cancelDuel') : nominative ? t('room.cancelChallenge') : t('room.closeRoom')

  return (
    <>
      <RoomPresenceChannel key={presence.attempt} roomId={roomId} />
      <Salon
        footer={
          <>
            {presence.refusal && (
              <View style={{ gap: tokens.space[2] }}>
                <Text variant="caption" color="muted" align="center">
                  {REFUSAL()[presence.refusal]}
                </Text>
                <Button full variant="gray" tone="neutral" onPress={presence.retry}>
                  {t('callback.retry')}
                </Button>
              </View>
            )}
            {wizzVisible && (
              <Button
                full
                icon={LightningIcon}
                loading={wizz.isPending}
                disabled={!wizzInfo.available}
                accessibilityLabel={t('room.wizz', { name: opponentName ?? t('room.opponentFallback') })}
                onPress={remind}
              >
                {wizzSeconds > 0 ? t('room.wizzIn', { seconds: wizzSeconds }) : t('room.wizz', { name: opponentName ?? t('room.opponentFallback') })}
              </Button>
            )}
            {shared && waiting && (
              <Button
                full
                size="L"
                icon={ShareNetworkIcon}
                onPress={() => shareLink({ kind: 'room', id: roomId, message: t('mobile.room.shareMessage', { topic }) })}
              >
                {t('share.roomButton')}
              </Button>
            )}
            {isInitiator && (
              <Button full size="L" variant="tinted" tone="destructive" loading={cancellation.isPending} disabled={cancellation.isPending} onPress={cancel}>
                {cancelLabel}
              </Button>
            )}
          </>
        }
      >
        <View style={{ alignItems: 'center', gap: tokens.space[3] }}>
          <Pill icon={kind.icon} style={{ alignSelf: 'center' }}>
            {kind.label}
          </Pill>
          <Text variant="title1" align="center" accessibilityRole="header">
            {topic}
          </Text>
          {countdown && (
            <Text variant="callout" color="muted" accessibilityLabel={t('room.expiresA11y', { countdown })}>
              {t('room.expiresIn')}{' '}
              <Text variant="callout" mono color="muted">
                {countdown}
              </Text>
            </Text>
          )}
        </View>
        <RoomPlayers me={meSeat} opponent={opponentSeat} />
        <PreparationSteps
          steps={PREPARATION_STEPS.map((item) => ({ ...item, label: `${t(STEP_LABEL[item.id])}…` }))}
          current={step}
          detail={detail}
          engaged={engaged}
          complete={preparationComplete(roomStatus)}
        />
      </Salon>
    </>
  )
}

/** Page standard : top bar Joutio, contenu défilant et actions fixes. */
function Salon({ footer, children }: { footer: React.ReactNode; children: React.ReactNode }) {
  const t = useT()
  return (
    <Screen
      header={<MobileTopBar variant="inline" back={t('topic.back')} title={t('room.title')} onBack={() => router.back()} />}
      contentStyle={{ gap: tokens.space[6], padding: tokens.space[5] }}
      bottomBar={<View style={{ gap: tokens.space[3], padding: tokens.space[5] }}>{footer}</View>}
    >
      {children}
    </Screen>
  )
}

/** Fin du salon sans duel : fermé, expiré, échec ou introuvable. */
function Terminal({ title, description, onBack }: { title: string; description: string; onBack: () => void }) {
  const t = useT()
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: tokens.space[5], backgroundColor: colors.bg }}>
      <EmptyState
        icon={WarningCircleIcon}
        title={title}
        description={description}
        action={
          <Button style={{ alignSelf: 'center' }} onPress={onBack}>
            {t('topic.back')}
          </Button>
        }
      />
    </View>
  )
}
