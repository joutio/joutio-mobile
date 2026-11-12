import { toast } from '@/design-system'
import { router, useLocalSearchParams, useIsFocused } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Share, View } from 'react-native'
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
import { readServerNow, useServerClock } from '@/lib/realtime/server-clock'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { PREPARATION_STEPS, preparationComplete, preparationStep, waitingStatusLabel, wizzState } from '@joutio/client-domain/rooms'
import { useRoom, useRoomPresence, useWizzRoom } from '../hooks/use-play'
import { playService } from '../lib/play-service'
import { usePlayerProfile } from '@/features/social/hooks/use-social'
import { userAvatar } from '@/shared/utils/avatar'
import { usePlaySession } from '../hooks/play-session'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'

export interface RoomRouteParams {
  roomId: string
  topicId?: string
  topicName?: string
  category?: string
  [key: string]: string | undefined
}

const TERMINAL = {
  CANCELLED: { title: 'Le salon a été fermé', description: "L'autre joueur ou toi avez annulé avant le duel." },
  EXPIRED: { title: 'Le salon a expiré', description: "Personne ne l'a rejoint à temps." },
  FAILED: { title: "Le duel n'a pas pu être préparé", description: 'Relance un duel depuis la fiche du sujet.' },
} as const

/** Lien public du salon (`joutio-landing` `/join/{roomId}` ouvre l'app). */
export const roomLink = (roomId: string) => `${config.siteUrl}/join/${roomId}`

/** Horloge serveur, relue chaque seconde (décompte d'expiration, cadence de la relance). */
function useServerNow() {
  const [now, setNow] = useState(readServerNow)
  useEffect(() => {
    const timer = setInterval(() => setNow(readServerNow()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

function countdownOf(expiresAt: string | null, now: number) {
  if (!expiresAt) return null
  const left = Math.max(0, Math.round((Date.parse(expiresAt) - now) / 1000))
  // Au-delà d'une heure (salon de 24 h) : heures et minutes ; dans la dernière heure : minutes et secondes.
  if (left >= 3600) return `${Math.floor(left / 3600)} h ${String(Math.floor((left % 3600) / 60)).padStart(2, '0')}`
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`
}

/**
 * Salon de préparation (`defis.md` § 2, `lancer-partie.md`, 2026-11-07 à l'image de joutio-web) : **un seul écran pour
 * toute salle** — salon partagé, défi nominatif, bot ou appariement. Face-à-face avec la présence de chacun, étapes de
 * préparation, décompte d'expiration ; partage du lien pour un salon partagé ; relance (« wizz ») de l'adversaire
 * nommé absent ; annulation par l'initiateur. Tant que les joueurs ne sont pas là, le retour quitte le salon sans le
 * fermer ; la préparation continue après le retour, suivie par le bandeau global.
 */
export function RoomScreen() {
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
  const engaged = !waiting && !(roomStatus in TERMINAL)

  const opponentId = vsBot ? null : isInitiator ? (room?.opponentId ?? room?.participantId ?? null) : (room?.initiatorId ?? null)
  // La vue REST ne connaît pas le second joueur d'un salon partagé arrivé après coup : son profil est lu à part.
  const fetched = usePlayerProfile(opponentId ?? '', Boolean(opponentId) && !view.data?.opponent)
  const opponentView = view.data?.opponent ?? null
  const opponentName = vsBot ? 'Robot' : (opponentView?.pseudonym ?? fetched.data?.pseudonym)
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
    if (params.fromPush === '1' && (roomStatus in TERMINAL || status?.terminalError)) {
      toast.info('Ce salon n’est plus disponible')
      router.replace('/challenges')
    }
  }, [params.fromPush, roomStatus, status?.terminalError])
  const close = () => router.back()

  if (roomStatus in TERMINAL || status?.terminalError) {
    const copy =
      status?.terminalError && !(roomStatus in TERMINAL)
        ? { title: 'Salon introuvable', description: 'Il a peut-être expiré.' }
        : TERMINAL[roomStatus as keyof typeof TERMINAL]
    return (
      <Screen header={<MobileTopBar variant="inline" back="Retour" title="Salon" onBack={close} />} scroll={false}>
        <Terminal title={copy.title} description={copy.description} onBack={close} />
      </Screen>
    )
  }

  const myName = me.data?.pseudonym ?? ''
  const myTier = me.data?.progression && !me.data.progression.provisional ? tierOf(me.data.progression.rating) : undefined
  const meSeat: RoomPlayer = { name: myName, src: myAvatar, tier: myTier, premium: identity.myPremium, away: !myPresent, status: myPresent ? 'Dans le salon' : 'Connexion…' }
  const opponentSeat: RoomPlayer | undefined = vsBot
    ? { name: 'Robot', status: 'Prêt' }
    : opponentId
      ? {
          name: opponentName ?? 'Adversaire',
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
  const kind = vsBot ? { icon: RobotIcon, label: 'Entraînement' } : nominative ? { icon: SwordIcon, label: 'Défi' } : { icon: LinkIcon, label: 'Salon privé' }
  const cancelLabel = vsBot ? 'Annuler le duel' : nominative ? 'Annuler le défi' : 'Fermer le salon'
  const link = roomLink(roomId)

  return (
    <>
      <Salon
        footer={
          <>
            {presence.failed && (
              <View style={{ gap: tokens.space[2] }}>
                <Text variant="caption" color="muted" align="center">
                  {presence.problem?.detail ?? 'Impossible de rejoindre le salon. Vérifie ta connexion.'}
                </Text>
                <Button full variant="gray" tone="neutral" onPress={presence.retry}>
                  Réessayer
                </Button>
              </View>
            )}
            {wizzVisible && (
              <Button
                full
                icon={LightningIcon}
                loading={wizz.isPending}
                disabled={!wizzInfo.available}
                accessibilityLabel={`Relancer ${opponentName ?? "l'adversaire"}`}
                onPress={() => wizz.mutate()}
              >
                {wizzSeconds > 0 ? `Relancer dans ${wizzSeconds} s` : `Relancer ${opponentName ?? "l'adversaire"}`}
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
            <Text variant="callout" color="muted" accessibilityLabel={`Le salon expire dans ${countdown}`}>
              Expire dans{' '}
              <Text variant="callout" mono color="muted">
                {countdown}
              </Text>
            </Text>
          )}
        </View>
        <RoomPlayers me={meSeat} opponent={opponentSeat} />
        <PreparationSteps steps={PREPARATION_STEPS} current={step} detail={detail} engaged={engaged} complete={preparationComplete(roomStatus)} />
        {shared && waiting && (
          <>
            <Button
              full
              icon={ShareNetworkIcon}
              variant="tinted"
              onPress={() => void Share.share({ message: `Viens me défier sur Joutio : ${topic}\n${link}` })}
            >
              Partager le lien
            </Button>
          </>
        )}
      </Salon>
    </>
  )
}

/** Page standard : top bar Joutio, contenu défilant et actions fixes. */
function Salon({ footer, children }: { footer: React.ReactNode; children: React.ReactNode }) {
  return (
    <Screen
      header={<MobileTopBar variant="inline" back="Retour" title="Salon" onBack={() => router.back()} />}
      contentStyle={{ gap: tokens.space[6], padding: tokens.space[5] }}
      bottomBar={<View style={{ gap: tokens.space[3], padding: tokens.space[5] }}>{footer}</View>}
    >
      {children}
    </Screen>
  )
}

/** Fin du salon sans duel : fermé, expiré, échec ou introuvable. */
function Terminal({ title, description, onBack }: { title: string; description: string; onBack: () => void }) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: tokens.space[5], backgroundColor: colors.bg }}>
      <EmptyState
        icon={WarningCircleIcon}
        title={title}
        description={description}
        action={
          <Button style={{ alignSelf: 'center' }} onPress={onBack}>
            Retour
          </Button>
        }
      />
    </View>
  )
}
