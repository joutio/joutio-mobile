import { countryName } from '@joutio/client/geo'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useEffect, useRef, useState } from 'react'
import { useWindowDimensions, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Avatar,
  Notice,
  Button,
  CheckCircleIcon,
  EmptyState,
  ForceDark,
  haptic,
  MatchmakingMap,
  RobotIcon,
  Text,
  toast,
  tokens,
  useTheme,
  useToastSuppression,
  type MapPlayer,
  PlayerName,
  TopBannerFrame,
  useScreenTopInset,
} from '@/design-system'
import { usePlayerIdentity } from '@/features/me'
import { PlayerPickerSheet } from '@/features/topic/components/duel-sheet'
import { formatNumber } from '@/features/topic/lib/format'
import { readServerNow, useServerClock } from '@/lib/realtime/server-clock'
import { tierOf } from '@/shared/utils/tier'
import { useAutoTrain, useBotDifficulty, useTicket, useTicketPresence, type PlayTopic } from '../hooks/use-play'
import { playService } from '../lib/play-service'
import { userAvatar } from '@/shared/utils/avatar'
import { currentLanguage, t, tierKey, useT } from '@/lib/i18n'
import { roomQuery } from '@joutio/client/query'
import { api } from '@/lib/api'

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
  const t = useT()
  const { colors, radius } = useTheme()
  const screenTop = useScreenTopInset()
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: screenTop + tokens.space[4], alignItems: 'center' }}>
      <View style={{ paddingHorizontal: tokens.space[4], paddingVertical: tokens.space[2], borderRadius: radius.full, backgroundColor: colors.glass }}>
        <Text variant="caption" weight="600" color="muted">
          {t('mm.ranked')}
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
  const t = useT()
  const identity = usePlayerIdentity()
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
  const autoTrain = useAutoTrain()
  const difficulty = useBotDifficulty((state) => state.difficulty)
  const [pickerOpen, setPickerOpen] = useState(false)

  const roomId = ticket.state?.roomId ?? null
  const room = useQuery({ ...roomQuery(api, roomId ?? ''), enabled: Boolean(roomId) })
  // La notification MATCHED porte déjà l'adversaire enrichi ; la salle reste le repli (ancien BFF, reprise REST).
  const opponent = ticket.state?.opponent ?? room.data?.opponent
  const opponentRating = opponent?.rating ?? null
  const opponentTier = opponentRating !== null ? tierOf(opponentRating) : undefined
  const opponentMeta = [
    opponentTier ? t(tierKey(opponentTier)) : undefined,
    opponentRating !== null ? formatNumber(opponentRating) : undefined,
    opponent?.country ? countryName(opponent.country, currentLanguage()) : undefined,
    t('mm.starting'),
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
    router.replace({ pathname: '/room/[roomId]', params: { roomId: id, topicId: topic.topicId, topicName: topic.name, category: topic.category ?? '' } })
  }
  const training = useMutation({
    mutationFn: () => playService.createBotRoom(topic.topicId, difficulty),
    onSuccess: ({ id }) => toRoom(id),
    onError: () => toast.error(t('play.trainingError'), { description: t('home.errorText') }),
  })
  const retry = useMutation({
    mutationFn: () => playService.enqueue(topic.topicId),
    onSuccess: (next) => {
      router.replace({ pathname: '/matchmaking/[ticketId]', params: { ...params, ticketId: next.ticketId } })
    },
    onError: () => toast.error(t('mobile.play.searchRestartFailed')),
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
      toast.error(t('mm.failed'), { description: t('mm.failedText') })
      router.back()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // Quitter l'écran pendant la recherche (ou perdre la connexion) l'annule : le serveur le constate.
  // « Annuler la recherche » est une intention du joueur : la commande part, l'écran se ferme sans attendre.
  const cancelSearch = () => {
    playService.cancelTicket(params.ticketId).catch(() => undefined)
    router.back()
  }
  useTicketPresence(params.ticketId, status === 'SEARCHING')

  const bottom = { position: 'absolute' as const, left: tokens.space[5], right: tokens.space[5], bottom: insets.bottom + tokens.space[5] }
  const found = status === 'MATCHED'

  return (
    <TopBannerFrame style={{ backgroundColor: colors.bg }}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <MatchmakingMap
          width={width}
          height={height}
          state={found ? 'found' : 'search'}
          // L'entraînement automatique garde les joueurs qui apparaissent (2026-11-15), comme la recherche.
          pins={status === 'SEARCHING' || (status === 'EXPIRED' && autoTrain.enabled) ? PINS : []}
          opponent={
            found ? { name: opponent?.pseudonym ?? t('topic.opponent'), src: userAvatar(opponent), ...FOUND_AT, label: opponent?.pseudonym } : undefined
          }
        />
        {!found && <Chrome />}

        {status === 'SEARCHING' && (
          // Même hauteur que l'entraînement automatique (2026-11-15) : « Annuler la recherche » au même endroit.
          <View style={[bottom, { bottom: insets.bottom + tokens.space[8], alignItems: 'center', gap: tokens.space[4] }]}>
            <Text variant="title2" align="center">
              {topic.name}
            </Text>
            <View
              accessible
              accessibilityRole="timer"
              accessibilityLabel={seconds === null ? t('mm.searchingShort') : t('mm.searchingA11y', { seconds })}
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
                {t('mm.searching')}
              </Text>
              {seconds !== null && (
                <Text variant="callout" weight="600" mono color="onAccent">
                  {seconds} s
                </Text>
              )}
            </View>
            <Button full size="L" variant="tinted" tone="destructive" onPress={cancelSearch}>
              {t('mm.cancel')}
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
                {t('mm.found')}
              </Text>
              <PlayerName name={opponent?.pseudonym ?? '…'} premium={identity.premium(opponent)} />
              <Text variant="caption" color="muted" numberOfLines={1}>
                {opponentMeta}
              </Text>
            </View>
            <CheckCircleIcon size={30} weight="fill" color={colors.correct} />
          </View>
        )}

        {status === 'EXPIRED' && autoTrain.enabled && (
          // Plus haut et plus espacé (2026-11-15) : « Annuler l'entraînement » à portée de pouce, loin du bord.
          <View style={[bottom, { bottom: insets.bottom + tokens.space[8], gap: tokens.space[6] }]}>
            <Notice tone="training" title={t('mm.autoTitle')} message={t('mm.autoText')} />
            <Button full size="L" variant="tinted" tone="destructive" onPress={() => router.back()}>
              {t('mm.cancelTraining')}
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
              title={t('mm.noneTitle')}
              description={t('mm.noneText', { topic: topic.name })}
              action={
                <View style={{ alignSelf: 'stretch', gap: tokens.space[3] }}>
                  <Button full size="L" icon={RobotIcon} loading={training.isPending} onPress={() => training.mutate()}>
                    {t('mm.train')}
                  </Button>
                  <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                    <Button full variant="tinted" style={{ flex: 1 }} loading={retry.isPending} onPress={() => retry.mutate()}>
                      {t('mm.retry')}
                    </Button>
                    <Button full variant="gray" tone="neutral" style={{ flex: 1 }} onPress={() => setPickerOpen(true)}>
                      {t('mm.friend')}
                    </Button>
                  </View>
                  <Button full variant="plain" tone="neutral" onPress={() => router.back()}>
                    {t('play.close')}
                  </Button>
                </View>
              }
            />
          </View>
        )}

        <PlayerPickerSheet
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          topic={topic}
          onSent={() => {
            setPickerOpen(false)
            router.back()
          }}
        />
      </View>
    </TopBannerFrame>
  )
}
