import { useMutation, useQuery } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Avatar,
  Banner,
  Button,
  CheckCircleIcon,
  EmptyState,
  ForceDark,
  haptic,
  MatchmakingMap,
  MobileSheet,
  ReconnectCountdown,
  RobotIcon,
  Text,
  toast,
  tokens,
  useTheme,
  useToastSuppression,
  type MapPlayer,
} from '@/design-system'
import { PlayerPicker } from '@/features/topic/components/duel-sheet'
import { formatNumber } from '@/features/topic/lib/format'
import { readServerNow, useServerClock } from '@/lib/realtime/server-clock'
import { useConnectionStore } from '@/lib/ws'
import { countryLabel } from '@/shared/utils/country'
import { tierOf } from '@/shared/utils/tier'
import { useAutoTrain, useBotDifficulty, useTicket, type PlayTopic } from '../hooks/use-play'
import { playService } from '../lib/play-service'
import { userAvatar } from '@/shared/utils/avatar'

/** Joueurs décoratifs qui apparaissent sur la carte pendant la recherche (le BFF n'expose pas la file d'attente). */
const PINS: MapPlayer[] = [
  { name: 'Lucas', lon: -74, lat: 41, tier: 'OR', color: '#c0e8ff' },
  { name: 'Ines', lon: 2, lat: 47, tier: 'ARGENT', color: '#c0e8ff' },
  { name: 'Nora', lon: 31, lat: 30, tier: 'PLATINE', color: '#c0e8ff' },
  { name: 'Hugo', lon: -46, lat: -23, tier: 'BRONZE', color: '#c0e8ff' },
]
/** Position de l'adversaire trouvé : le BFF ne donne pas son pays, la carte se pose sur l'Europe. */
const FOUND_AT = { lon: 2.35, lat: 46.6 }
const FOUND_MS = 1200

export interface MatchmakingRouteParams {
  ticketId: string
  topicId: string
  topicName: string
  category?: string
  [key: string]: string | undefined
}

function useSecondsLeft(deadlineAt: string | null) {
  const [now, setNow] = useState(readServerNow)
  useEffect(() => {
    const timer = setInterval(() => setNow(readServerNow()), 250)
    return () => clearInterval(timer)
  }, [])
  return deadlineAt ? Math.max(0, Math.ceil((Date.parse(deadlineAt) - now) / 1000)) : null
}

/** Pastille « Partie classée », seule en haut : toutes les actions sont en bas, à portée de pouce. */
function Chrome() {
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: insets.top + tokens.space[4], alignItems: 'center' }}>
      <View style={{ paddingHorizontal: tokens.space[4], paddingVertical: tokens.space[2], borderRadius: radius.full, backgroundColor: colors.glass }}>
        <Text variant="caption" weight="600" color="muted">
          Partie classée
        </Text>
      </View>
    </View>
  )
}

/**
 * Recherche d'adversaire (`matchmaking.md`) : plein écran sombre, carte en fond. Le décompte suit l'échéance
 * serveur (`deadlineAt`). À l'expiration : entraînement automatique (préférence du profil) ou les choix.
 */
export function MatchmakingScreen() {
  return (
    <ForceDark>
      <MatchmakingScreenContent />
    </ForceDark>
  )
}

function MatchmakingScreenContent() {
  useToastSuppression()
  const params = useLocalSearchParams<MatchmakingRouteParams>()
  const topic: PlayTopic = { topicId: params.topicId, name: params.topicName, category: params.category }
  useServerClock()
  const { colors, radius } = useTheme()
  const insets = useSafeAreaInsets()
  const { width, height } = useWindowDimensions()
  const ticket = useTicket(params.ticketId)
  const status = ticket.state?.status ?? 'SEARCHING'
  const seconds = useSecondsLeft(ticket.state?.deadlineAt ?? null)
  const connection = useConnectionStore((state) => state.status)
  const autoTrain = useAutoTrain()
  const difficulty = useBotDifficulty((state) => state.difficulty)
  const [pickerOpen, setPickerOpen] = useState(false)
  const settled = useRef(false)

  const roomId = ticket.state?.roomId ?? null
  const room = useQuery({ queryKey: ['rooms', roomId], queryFn: () => playService.room(roomId ?? ''), enabled: Boolean(roomId) })
  // La notification MATCHED porte déjà l'adversaire enrichi ; la salle reste le repli (ancien BFF, reprise REST).
  const opponent = ticket.state?.opponent ?? room.data?.opponent
  const opponentRating = opponent?.rating ?? null
  const opponentTier = opponentRating !== null && opponent?.provisional !== true ? tierOf(opponentRating) : undefined
  const opponentMeta = [
    opponentTier ? tokens.tier[opponentTier].label : undefined,
    opponentRating !== null ? formatNumber(opponentRating) : undefined,
    opponent?.country ? countryLabel(opponent.country) : undefined,
    'Le duel commence',
  ]
    .filter(Boolean)
    .join(' · ')

  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )
  const toRoom = (id: string) => {
    // Écran quitté entre-temps (« Annuler l'entraînement ») : la salle créée trop tard est fermée.
    if (!mounted.current) {
      playService.cancelRoom(id).catch(() => undefined)
      return
    }
    settled.current = true
    router.replace({ pathname: '/room/[roomId]', params: { roomId: id, topicId: topic.topicId, topicName: topic.name, category: topic.category ?? '' } })
  }
  const training = useMutation({
    mutationFn: () => playService.createBotRoom(topic.topicId, difficulty),
    onSuccess: ({ id }) => toRoom(id),
    onError: () => toast.error("L'entraînement n'a pas pu démarrer", { description: 'Vérifie ta connexion, puis réessaie.' }),
  })
  const retry = useMutation({
    mutationFn: () => playService.enqueue(topic.topicId),
    onSuccess: (next) => {
      settled.current = true
      router.replace({ pathname: '/matchmaking/[ticketId]', params: { ...params, ticketId: next.ticketId } })
    },
    onError: () => toast.error("La recherche n'a pas pu redémarrer"),
  })

  // Adversaire trouvé : 1,2 s sur sa carte, puis la salle prépare le duel.
  useEffect(() => {
    if (status !== 'MATCHED' || !roomId) return
    haptic('light')
    const timer = setTimeout(() => toRoom(roomId), ticket.state?.vsBot ? 0 : FOUND_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, roomId])

  // Expiré, réglage activé : l'entraînement démarre seul.
  useEffect(() => {
    if (status === 'EXPIRED' && autoTrain.enabled && !training.isPending && !training.isSuccess) training.mutate()
    if (status === 'FAILED') {
      toast.error('La recherche a échoué', { description: 'Réessaie dans un instant.' })
      router.back()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Quitter pendant la recherche supprime le ticket.
  const statusRef = useRef(status)
  statusRef.current = status
  useEffect(
    () => () => {
      if (!settled.current && statusRef.current === 'SEARCHING') playService.cancelTicket(params.ticketId).catch(() => undefined)
    },
    [params.ticketId],
  )

  const bottom = { position: 'absolute' as const, left: tokens.space[5], right: tokens.space[5], bottom: insets.bottom + tokens.space[5] }
  const found = status === 'MATCHED'

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MatchmakingMap
        width={width}
        height={height}
        state={found ? 'found' : 'search'}
        pins={status === 'SEARCHING' ? PINS : []}
        opponent={found ? { name: opponent?.pseudonym ?? 'Adversaire', src: userAvatar(opponent), ...FOUND_AT, label: opponent?.pseudonym } : undefined}
      />
      {!found && <Chrome />}

      {status === 'SEARCHING' && (
        <View style={[bottom, { alignItems: 'center', gap: tokens.space[4] }]}>
          <Text variant="title2" align="center">
            {topic.name}
          </Text>
          <View
            accessible
            accessibilityRole="timer"
            accessibilityLabel={`Recherche d'un adversaire${seconds === null ? '' : `, ${seconds} secondes`}`}
            style={{
              height: 40,
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space[4],
              paddingHorizontal: tokens.space[5],
              borderRadius: radius.full,
              backgroundColor: colors.accent,
            }}
          >
            <Text variant="callout" weight="600" color="onAccent">
              Recherche d'un adversaire…
            </Text>
            {seconds !== null && (
              <Text variant="callout" weight="600" mono color="onAccent">
                {seconds} s
              </Text>
            )}
          </View>
          <Button full size="L" variant="tinted" tone="destructive" onPress={() => router.back()}>
            Annuler la recherche
          </Button>
        </View>
      )}

      {found && (
        <View
          style={[
            bottom,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space[5],
              padding: tokens.space[5],
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <Avatar name={opponent?.pseudonym ?? '?'} src={userAvatar(opponent)} size="lg" decorative />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="caption" weight="600" color="correct">
              Adversaire trouvé
            </Text>
            <Text variant="headline" numberOfLines={1}>
              {opponent?.pseudonym ?? '…'}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {opponentMeta}
            </Text>
          </View>
          <CheckCircleIcon size={30} weight="fill" color={colors.correct} />
        </View>
      )}

      {status === 'EXPIRED' && autoTrain.enabled && (
        <View style={[bottom, { gap: tokens.space[4] }]}>
          <Banner
            tone="training"
            title="Aucun adversaire, lancement d'un entraînement…"
            message="Partie sans XP ni série. Tu pourras retenter un duel humain ensuite."
          />
          <Button full size="L" variant="tinted" tone="destructive" onPress={() => router.back()}>
            {"Annuler l'entraînement"}
          </Button>
        </View>
      )}

      {status === 'EXPIRED' && !autoTrain.enabled && (
        <View
          style={[
            bottom,
            {
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              paddingVertical: tokens.space[6],
              paddingHorizontal: tokens.space[5],
            },
          ]}
        >
          <EmptyState
            icon={RobotIcon}
            title="Aucun adversaire trouvé"
            description={`${topic.name} · 10 s de recherche. Relance une recherche, ou entraîne-toi contre un robot (sans expérience gagnée) le temps qu'un adversaire se présente.`}
            action={
              <View style={{ alignSelf: 'stretch', gap: tokens.space[3] }}>
                <Button full size="L" icon={RobotIcon} loading={training.isPending} onPress={() => training.mutate()}>
                  S'entraîner contre un robot
                </Button>
                <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                  <Button full variant="tinted" style={{ flex: 1 }} loading={retry.isPending} onPress={() => retry.mutate()}>
                    Relancer
                  </Button>
                  <Button full variant="gray" tone="neutral" style={{ flex: 1 }} onPress={() => setPickerOpen(true)}>
                    Défier un ami
                  </Button>
                </View>
                <Button full variant="plain" tone="neutral" onPress={() => router.back()}>
                  Fermer
                </Button>
              </View>
            }
          />
        </View>
      )}

      {connection === 'reconnecting' && status === 'SEARCHING' && <ReconnectCountdown onLeave={() => router.back()} leaveLabel="Annuler la recherche" />}
      <MobileSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Qui veux-tu défier ?" subtitle={topic.name} tall>
        <PlayerPicker
          topic={topic}
          onSent={() => {
            setPickerOpen(false)
            router.back()
          }}
        />
      </MobileSheet>
    </View>
  )
}
