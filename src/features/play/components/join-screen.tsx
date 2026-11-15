import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Avatar,
  Badge,
  Button,
  ClockCountdownIcon,
  EmptyState,
  IconButton,
  LightningIcon,
  LinkIcon,
  ListGroup,
  ListRow,
  NumberCircleTwoIcon,
  PlayerName,
  QuestionIcon,
  Screen,
  Skeleton,
  Text,
  TimerIcon,
  TopicCard,
  toCategoryCode,
  tokens,
  useTheme,
  XIcon,
  type Icon,
  type TierCode,
} from '@/design-system'
import { useSessionStore } from '@/features/auth'
import { useMe, usePlayerIdentity } from '@/features/me'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { usePendingJoin } from '@/shared/stores/pending-join-store'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { userAvatar } from '@/shared/utils/avatar'
import { countdownOf, useServerNow } from '../lib/countdown'
import { playService } from '../lib/play-service'
import { currentLanguage, formatNumber, t, tierKey, useT } from '@/lib/i18n'

/** Conditions du duel, en `ListRow` informatives (`lancer-partie.md` § 2). */
const RULES = (): readonly { icon: Icon; label: string }[] => ([
  { icon: TimerIcon, label: t('join.ruleRounds') },
  { icon: LightningIcon, label: t('join.ruleSpeed') },
  { icon: NumberCircleTwoIcon, label: t('join.ruleDouble') },
])

/** Colonne de 370 pt au plus (face-à-face, sujet, conditions, bouton) : sur un grand écran, la page garde une taille de téléphone. */
const COLUMN = { width: '100%', maxWidth: 370, alignSelf: 'center' } as const
const SEAT = 88

type SeatProps = { name: string; src?: string; rating?: number | null; provisional?: boolean | null; premium?: boolean; guest?: string }

/** Une place du face-à-face : avatar, nom, rang et Elo ; sans compte, une place à prendre (`guest` : son indication). */
function Seat({ name, src, rating, provisional, premium, guest }: SeatProps) {
  const { colors, radius } = useTheme()
  const tier: TierCode | undefined = rating != null && !provisional ? tierOf(rating) : undefined
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.space[3] }}>
      {guest ? (
        <View
          style={{
            width: SEAT,
            height: SEAT,
            borderRadius: radius.full,
            borderWidth: 2,
            borderStyle: 'dashed',
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QuestionIcon size={30} color={colors.muted} />
        </View>
      ) : (
        <Avatar name={name} src={src} tier={tier} size="xxl" decorative />
      )}
      <PlayerName name={name} premium={premium} variant="headline" color={guest ? 'muted' : 'text'} justify="center" />
      {guest ? (
        <Text variant="caption" color="muted" align="center">
          {guest}
        </Text>
      ) : tier && rating != null ? (
        <Badge variant="tier" tier={tier}>{t('common.dotPair', { a: t(tierKey(tier)), b: formatNumber(rating, currentLanguage()) })}</Badge>
      ) : null}
    </View>
  )
}

function close() {
  if (router.canGoBack()) router.back()
  else router.replace('/home')
}

/**
 * Rejoindre un salon (`lancer-partie.md` § 2, lab `rejoindre.tsx`, refonte face-à-face du 2026-11-14), ouvert par un
 * lien partagé (`joutio://join/{roomId}`), hors onglets : Fermer et échéance en haut, invitation, face-à-face de l'hôte
 * et du joueur (place à prendre sans compte), `TopicCard` du sujet (240 pt), conditions en `ListRow`, « Rejoindre le
 * duel » en bas. Sans compte, la connexion ramène ici.
 */
export function JoinScreen() {
  const t = useT()
  const { roomId } = useLocalSearchParams<{ roomId: string }>()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(authenticated)
  const identity = usePlayerIdentity()
  const myAvatar = useMyAvatar()
  const now = useServerNow()
  const setPending = usePendingJoin((state) => state.set)
  const room = useQuery({ queryKey: ['rooms', roomId], queryFn: () => playService.room(roomId), enabled: authenticated, retry: 1 })

  const view = room.data
  const unavailable = room.isError || (view && (view.status !== 'WAITING_PLAYERS' || view.gameId !== null))
  const host = view?.opponent
  const countdown = countdownOf(view?.expiresAt, now)
  const join = () => {
    if (!authenticated) {
      setPending(roomId)
      router.push('/login')
      return
    }
    setPending(null)
    router.replace({
      pathname: '/room/[roomId]',
      params: { roomId, topicId: view?.topic.topicId ?? '', topicName: view ? topicName(view.topic.names) : '', category: view?.topic.category ?? '' },
    })
  }

  const header = (
    <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: tokens.space[3], paddingRight: tokens.space[5] }}>
      <IconButton icon={XIcon} label={t('play.close')} variant="plain" tone="neutral" onPress={close} />
      {countdown && !unavailable && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}>
          <ClockCountdownIcon size={16} color={colors.muted} />
          <Text variant="callout" color="muted">
            {t('room.expiresIn')}{' '}
            <Text variant="callout" mono weight="600">
              {countdown}
            </Text>
          </Text>
        </View>
      )}
    </View>
  )

  if (unavailable)
    return (
      <Screen header={header} contentStyle={{ flexGrow: 1, paddingHorizontal: tokens.space[5] }}>
        <EmptyState
          fill
          icon={LinkIcon}
          title={t('join.unavailableTitle')}
          description={t('join.unavailableText')}
          action={
            <Button full onPress={() => router.replace('/topics')}>
              {t('join.explore')}
            </Button>
          }
        />
      </Screen>
    )

  const loading = authenticated && room.isPending
  const progression = me.data?.progression
  return (
    <Screen
      header={header}
      contentStyle={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[6] }}
      bottomBar={
        // 370 pt de bouton, centré : la colonne de la page.
        <View style={[COLUMN, { gap: tokens.space[3], paddingTop: tokens.space[3], paddingBottom: Math.max(0, tokens.space[3] - insets.bottom) }]}>
          <View style={{ paddingHorizontal: tokens.space[5] }}>
            <Button full icon={LightningIcon} disabled={authenticated && (room.isPending || (me.data ? !me.data.onboardingCompleted : false))} onPress={join}>
              {authenticated ? t('join.join') : t('join.signIn')}
            </Button>
          </View>
          {!authenticated && (
            <Text variant="caption" color="muted" align="center">
              {t('join.noAccount')}
            </Text>
          )}
        </View>
      }
    >
      <Text variant="title1" align="center" accessibilityRole="header">
        {host ? t('join.invitedBy', { name: host.pseudonym }) : t('join.invited')}
      </Text>
      <View style={[COLUMN, { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] }]}>
        {loading || !host ? (
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Skeleton shape="circle" width={SEAT} />
          </View>
        ) : (
          <Seat name={host.pseudonym} src={userAvatar(host)} rating={host.rating} provisional={host.provisional} premium={identity.premium(host)} />
        )}
        <View style={{ marginTop: 30, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent }}>
          <LightningIcon size={14} weight="fill" color={colors.onAccent} />
        </View>
        {authenticated && me.data ? (
          <Seat name={me.data.pseudonym} src={myAvatar} rating={progression?.rating} provisional={progression?.provisional} premium={identity.myPremium} />
        ) : (
          <Seat name={t('join.guest')} guest={t('join.guestLogin')} />
        )}
      </View>
      {view && (
        // Même largeur que les cartes paysage des rails de l'Accueil (240 pt), centrée.
        <TopicCard
          official={view.topic.official ?? false}
          title={topicName(view.topic.names)}
          category={toCategoryCode(view.topic.category)}
          image={view.topic.imageUrl ?? undefined}
          style={{ width: '100%', maxWidth: 240, alignSelf: 'center' }}
        />
      )}
      {/* Conditions du duel : lignes informatives, comme les autorisations de l'onboarding. */}
      <ListGroup surface="surface" style={COLUMN}>
        {RULES().map(({ icon, label }, index) => (
          <ListRow key={label} icon={icon} label={label} control="none" last={index === RULES().length - 1} />
        ))}
      </ListGroup>
    </Screen>
  )
}
