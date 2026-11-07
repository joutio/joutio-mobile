import * as Clipboard from 'expo-clipboard'
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, Share, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Button,
  EmptyState,
  ForceDark,
  haptic,
  IconButton,
  InviteCard,
  LightningIcon,
  LinkIcon,
  Pill,
  PreparationSteps,
  ReconnectCountdown,
  RobotIcon,
  RoomPlayers,
  ShareNetworkIcon,
  SwordIcon,
  Text,
  tokens,
  useTheme,
  WarningCircleIcon,
  XIcon,
  type RoomPlayer,
} from '@/design-system'
import { useMe } from '@/features/me'
import { config } from '@/lib/config'
import { readServerNow, useServerClock } from '@/lib/realtime/server-clock'
import { useConnectionStore } from '@/lib/ws'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { PREPARATION_STEPS, preparationComplete, preparationStep, waitingStatusLabel, wizzState } from '../domain/room'
import { useRoom, useRoomPresence, useWizzRoom } from '../hooks/use-play'
import { playService } from '../lib/play-service'
import { usePlayerProfile } from '@/features/social/hooks/use-social'
import { userAvatar } from '@/shared/utils/avatar'
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
 * préparation, décompte d'expiration ; lien et QR code pour un salon partagé ; relance (« wizz ») de l'adversaire
 * nommé absent ; annulation par l'initiateur. Tant que les joueurs ne sont pas là, la croix quitte le salon sans le
 * fermer ; une préparation engagée ne peut plus être quittée (seule l'annulation reste). Sombre, comme le duel qui suit.
 */
export function RoomScreen() {
  const params = useLocalSearchParams<RoomRouteParams>()
  const roomId = params.roomId
  useServerClock()
  const me = useMe(true)
  const myAvatar = useMyAvatar()
  const userId = me.data?.userId ?? ''
  const { view, room, status } = useRoom(roomId)
  const connection = useConnectionStore((state) => state.status)
  const presence = useRoomPresence(roomId, true)
  const wizz = useWizzRoom(roomId)
  const now = useServerNow()
  const [copied, setCopied] = useState(false)

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
  const wizzInfo = room ? wizzState(room, userId || null, now) : { available: false, cooldownEndsAt: null }
  const wizzSeconds = wizzInfo.cooldownEndsAt ? Math.max(0, Math.ceil((wizzInfo.cooldownEndsAt - now) / 1000)) : 0
  const wizzVisible = nominative && waiting && (wizzInfo.available || wizz.isPending || wizzSeconds > 0)

  // La partie est créée : le duel remplace la salle (le retour ramène à l'écran d'avant).
  const done = useRef(false)
  useEffect(() => {
    if (!gameId || done.current) return
    done.current = true
    router.replace({ pathname: '/duel/[gameId]', params: { gameId, topicName: topic, category: category ?? '', topicId: topicId ?? '' } })
  }, [gameId, topic, category, topicId])

  // Quitter l'écran pendant l'attente : on quitte le salon sans le fermer (joutio-web) ; l'annulation est explicite.
  const leftRef = useRef(false)
  const waitingRef = useRef(waiting)
  waitingRef.current = waiting
  useEffect(
    () => () => {
      if (done.current || leftRef.current || !waitingRef.current) return
      playService.leaveRoom(roomId).catch(() => undefined)
    },
    [roomId],
  )
  // Préparation engagée : le retour (geste, bouton Android) ne quitte plus le salon.
  usePreventRemove(engaged && !gameId, () => haptic('warning'))

  const leave = () => {
    leftRef.current = true
    playService.leaveRoom(roomId).catch(() => undefined)
    router.back()
  }
  const cancel = () => {
    leftRef.current = true
    playService.cancelRoom(roomId).catch(() => undefined)
    router.back()
  }
  const close = () => router.back()

  if (roomStatus in TERMINAL || status?.terminalError) {
    const copy =
      status?.terminalError && !(roomStatus in TERMINAL)
        ? { title: 'Salon introuvable', description: 'Il a peut-être expiré.' }
        : TERMINAL[roomStatus as keyof typeof TERMINAL]
    return (
      <ForceDark>
        <Terminal title={copy.title} description={copy.description} onBack={close} />
      </ForceDark>
    )
  }

  const myName = me.data?.pseudonym ?? ''
  const myTier = me.data?.progression && !me.data.progression.provisional ? tierOf(me.data.progression.rating) : undefined
  const meSeat: RoomPlayer = { name: myName, src: myAvatar, tier: myTier, away: !myPresent, status: myPresent ? 'Dans le salon' : 'Connexion…' }
  const opponentSeat: RoomPlayer | undefined = vsBot
    ? { name: 'Robot', status: 'Prêt' }
    : opponentId
      ? {
          name: opponentName ?? 'Adversaire',
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
    <ForceDark>
      <Salon
        top={waiting ? <IconButton icon={XIcon} label={isInitiator ? 'Quitter sans fermer le salon' : 'Quitter le salon'} onPress={leave} /> : null}
        footer={
          <>
            {presence.failed && (
              <View style={{ gap: tokens.space[2] }}>
                <Text variant="caption" color="muted" align="center">
                  Impossible de rejoindre le salon. Vérifie ta connexion.
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
              <Button full size="L" variant="tinted" tone="destructive" onPress={cancel}>
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
      {connection === 'reconnecting' && <ReconnectCountdown onLeave={waiting ? leave : cancel} leaveLabel={waiting ? 'Quitter le salon' : cancelLabel} />}
    </ForceDark>
  )
}

/** Gabarit du salon : croix en haut à droite, contenu qui défile, actions collées en bas. */
function Salon({ top, footer, children }: { top: React.ReactNode; footer: React.ReactNode; children: React.ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + tokens.space[3] }}>
      <View style={{ height: 52, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: tokens.space[3] }}>{top}</View>
      <ScrollView
        contentContainerStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingBottom: tokens.space[5] }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
      <View style={{ gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3] }}>{footer}</View>
    </View>
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
