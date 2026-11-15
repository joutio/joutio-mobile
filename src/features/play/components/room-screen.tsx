import { buildShareUrl } from '@joutio/client/share'
import { useShare } from '@/features/share'
import { toast } from '@/design-system'
import { useLocalSearchParams, useIsFocused } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import {
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
import { useCloseRoom } from '@/features/challenges/hooks/use-challenges'
import { useMe, usePlayerIdentity } from '@/features/me'
import { config } from '@/lib/config'
import { useServerClock } from '@/lib/realtime/server-clock'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import {
  PREPARATION_STEPS,
  preparationComplete,
  preparationStep,
  roomFailureKind,
  waitingStatusLabel,
  wizzState,
  type RoomFailureKind,
} from '@joutio/client/rooms'
import { useRoom, useRoomPresence, useWizzRoom } from '../hooks/use-play'
import { playService } from '../lib/play-service'
import { usePlayerProfile } from '@/features/social/hooks/use-social'
import { userAvatar } from '@/shared/utils/avatar'
import { usePlaySession } from '../hooks/play-session'
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

const TERMINAL = () => ({
  CANCELLED: { title: t('room.cancelledTitle'), description: t('room.cancelledText') },
  EXPIRED: { title: t('room.expiredTitle'), description: t('room.expiredText') },
  FAILED: { title: t('room.failedTitle'), description: t('room.failedText') },
} as const)

/** Explication d'un échec selon le motif serveur (`ROOM_FAILED.reason`) ; repli générique. */
const FAILURE_DESCRIPTION = (): Record<RoomFailureKind, string> => ({
  language: t('room.failedLanguageText'),
  topic: t('room.failedTopicText'),
  timeout: t('room.failedTimeoutText'),
  unknown: TERMINAL().FAILED.description,
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
  const me = useMe(true)
  const myAvatar = useMyAvatar()
  const userId = me.data?.userId ?? ''
  const { view, room, status } = useRoom(roomId)
  const presence = useRoomPresence(roomId)
  const wizz = useWizzRoom(roomId)
  const cancellation = useCloseRoom()
  const now = useServerNow()
  const focused = useIsFocused()
  const { trackRoom } = usePlaySession()
  useEffect(() => trackRoom(roomId), [roomId, trackRoom])

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
  const fetched = usePlayerProfile(opponentId ?? '', Boolean(opponentId) && !view.data?.opponent)
  const opponentView = view.data?.opponent ?? null
  const opponentName = vsBot ? t('topic.bot') : (opponentView?.pseudonym ?? fetched.data?.pseudonym)
  const myPresent = room ? (isInitiator ? room.initiatorPresent : room.participantPresent) : false
  const opponentPresent = vsBot ? true : room ? (isInitiator ? room.participantPresent : room.initiatorPresent) : false
  const countdown = waiting ? countdownOf(room?.expiresAt ?? view.data?.expiresAt ?? null, now) : null
  const serverWizz = room ? wizzState(room, userId || null, now) : { available: false, cooldownEndsAt: null }
  const localCooldown = wizz.sentAt === null ? 0 : wizz.sentAt + 10_000
  const wizzInfo = {
    ...serverWizz,
    available: serverWizz.available && localCooldown <= now,
    cooldownEndsAt: Math.max(serverWizz.cooldownEndsAt ?? 0, localCooldown) || null,
  }
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

  const cancel = () => {
    cancellation.mutate(roomId, {
      onSuccess: () => router.back(),
    })
  }
  useEffect(() => {
    if (params.fromPush === '1' && (roomStatus in TERMINAL() || status?.terminalError)) {
      toast.info(t('mobile.room.unavailable'))
      router.replace('/challenges')
    }
  }, [params.fromPush, roomStatus, status?.terminalError])
  const close = () => router.back()
  // Avant tout `return` : l'écran terminal (salon fermé, expiré) ne doit pas sauter de hook (2026-11-14).
  const shareLink = useShare()

  if (roomStatus in TERMINAL() || status?.terminalError) {
    const copy =
      status?.terminalError && !(roomStatus in TERMINAL())
        ? { title: t('room.notFoundTitle'), description: t('room.notFoundText') }
        : roomStatus === 'FAILED'
          ? { title: TERMINAL().FAILED.title, description: FAILURE_DESCRIPTION()[roomFailureKind(room?.failureReason)] }
          : TERMINAL()[roomStatus as keyof ReturnType<typeof TERMINAL>]
    return (
      <Screen header={<MobileTopBar variant="inline" back={t('topic.back')} title={t('room.title')} onBack={close} />} scroll={false}>
        <Terminal title={copy.title} description={copy.description} onBack={close} />
      </Screen>
    )
  }

  const myName = me.data?.pseudonym ?? ''
  const myTier = me.data?.progression && !me.data.progression.provisional ? tierOf(me.data.progression.rating) : undefined
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
          tier: opponentView?.rating != null && !opponentView.provisional ? tierOf(opponentView.rating) : undefined,
          away: !opponentPresent,
        }
      : undefined
  const step = preparationStep(roomStatus)
  const detail = waiting
    ? waitingStatusLabel({ playerPresent: myPresent, opponentPresent: opponentPresent && Boolean(opponentSeat), opponentLabel: opponentName ?? null })
    : undefined
  const kind = vsBot ? { icon: RobotIcon, label: t('room.training') } : nominative ? { icon: SwordIcon, label: t('room.challenge') } : { icon: LinkIcon, label: t('room.private') }
  const cancelLabel = vsBot ? t('room.cancelDuel') : nominative ? t('room.cancelChallenge') : t('room.closeRoom')
  const link = roomLink(roomId)

  return (
    <>
      <Salon
        footer={
          <>
            {presence.failed && (
              <View style={{ gap: tokens.space[2] }}>
                <Text variant="caption" color="muted" align="center">
                  {presence.problem?.detail ?? t('room.presenceError')}
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
                onPress={() => wizz.mutate()}
              >
                {wizzSeconds > 0 ? t('room.wizzIn', { seconds: wizzSeconds }) : t('room.wizz', { name: opponentName ?? t('room.opponentFallback') })}
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
        <PreparationSteps steps={PREPARATION_STEPS.map((item) => ({ ...item, label: `${t(STEP_LABEL[item.id])}…` }))} current={step} detail={detail} engaged={engaged} complete={preparationComplete(roomStatus)} />
        {shared && waiting && (
          <>
            <Button
              full
              icon={ShareNetworkIcon}
              variant="tinted"
              onPress={() => shareLink({ kind: 'room', id: roomId, message: t('mobile.room.shareMessage', { topic }) })}
            >
              {t('share.roomButton')}
            </Button>
          </>
        )}
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
