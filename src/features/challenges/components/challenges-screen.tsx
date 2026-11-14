import { NotificationButton } from '@/features/notifications/components/notification-button'
import { SettingsButton } from '@/features/settings/components/settings-button'
import { useQueryClient } from '@tanstack/react-query'
import { router } from '@/shared/navigation/router'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState, type ReactNode } from 'react'
import { RefreshControl, View } from 'react-native'
import {
  Button,
  ChallengeListRow,
  DoorOpenIcon,
  DragToLoadMore,
  EmptyState,
  FeedFooter,
  IconButton,
  LightningIcon,
  ListGroup,
  ListRow,
  MobileTopBar,
  Screen,
  SectionHeader,
  showDialog,
  Skeleton,
  TabLoadMoreScrollView,
  TabScrollView,
  TabsScrollView,
  tokens,
  useGuardedRefresh,
  useTheme,
  WarningCircleIcon,
} from '@/design-system'
import { useMe, usePlayerIdentity } from '@/features/me'
import { useCreatePrivateRoom } from '@/features/play/hooks/use-play'
import { readServerNow } from '@/lib/realtime/server-clock'
import { queryKeys } from '@/lib/query-keys'
import { TopicPickerSheet } from '@/features/topics/components/topic-picker-sheet'
import type { ChallengeView } from '@joutio/client-domain/api-types'
import { avatarSvg } from '@/shared/utils/avatar'
import { topicName } from '@/shared/utils/topic-name'
import {
  resumableRooms,
  splitChallenges,
  useAcceptChallenge,
  useCancelChallenge,
  useDeclineChallenges,
  useMyChallenges,
  useMyRooms,
} from '../hooks/use-challenges'
import { duration } from '../lib/challenges-service'
import { clientSource, feedFooterProps } from '@/shared/utils/paging'
import type { ChallengesTab } from '@/features/notifications/lib/notification-target'

const GUTTER = tokens.space[5]
/** Reçus : liste paginée, 10 par page. */
const RECEIVED_PAGE = 10
const TABS: readonly { value: ChallengesTab; label: string }[] = [
  { value: 'received', label: 'Reçus' },
  { value: 'sent', label: 'Envoyés' },
  { value: 'rooms', label: 'Salons' },
]
const PAGE = { gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[4], paddingBottom: tokens.space[7] }

function Loading() {
  return (
    <View accessibilityLabel="Chargement" style={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
      {[0, 1, 2, 3].map((index) => (
        <Skeleton key={index} shape="card" style={{ height: 112 }} />
      ))}
    </View>
  )
}

/**
 * Défis (`design/specs/screens/defis.md`) : barre « Défis » (cloche, Réglages), puis onglets Reçus / Envoyés / Salons
 * balayables comme l'Accueil (2026-11-14), leur nombre dans le libellé. Reçus (par défaut) : liste paginée et « Tout
 * refuser ». Une notification ouvre l'onglet voulu (`?tab=`). Rafraîchi par le flux personnel STOMP et au tiré.
 */
export function ChallengesScreen() {
  const identity = usePlayerIdentity()
  const { colors } = useTheme()
  const client = useQueryClient()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const challenges = useMyChallenges(Boolean(userId))
  const rooms = useMyRooms(Boolean(userId))
  const accept = useAcceptChallenge()
  const decline = useDeclineChallenges()
  const cancel = useCancelChallenge()
  const createRoom = useCreatePrivateRoom()
  const [tab, setTab] = useState<ChallengesTab>('received')
  // Onglet demandé par une notification : appliqué puis effacé, pour qu'une même demande rejoue plus tard.
  const params = useLocalSearchParams<{ tab?: string }>()
  useEffect(() => {
    const requested = TABS.find((item) => item.value === params.tab)?.value
    if (!requested) return
    setTab(requested)
    router.setParams({ tab: undefined })
  }, [params.tab])
  const [receivedPages, setReceivedPages] = useState(1)
  const [pickerOpen, setPickerOpen] = useState(false)

  const { received, sent } = splitChallenges(challenges.data, userId)
  const salons = resumableRooms(rooms.data)
  const now = readServerNow()
  const loading = challenges.isPending || rooms.isPending
  const failed = challenges.isError || rooms.isError
  const empty = !loading && !failed && received.length + sent.length + salons.length === 0
  const receivedRows = received.slice(0, receivedPages * RECEIVED_PAGE)
  const receivedSource = clientSource(receivedPages, setReceivedPages, receivedRows.length < received.length)
  const counts: Record<ChallengesTab, number> = { received: received.length, sent: sent.length, rooms: salons.length }

  const { refreshing, refresh } = useGuardedRefresh(() =>
    Promise.all([client.refetchQueries({ queryKey: queryKeys.challenges() }), client.refetchQueries({ queryKey: queryKeys.rooms() })]),
  )

  const refuseAll = () =>
    showDialog({
      title: `Refuser les ${received.length} défis reçus ?`,
      message: 'Les joueurs seront prévenus. Tu pourras toujours les défier à ton tour.',
      icon: LightningIcon,
      tone: 'danger',
      actions: [
        {
          label: 'Tout refuser',
          variant: 'filled',
          tone: 'destructive',
          onPress: () => decline.mutateAsync(received.map((challenge) => challenge.challengeId)),
        },
        { label: 'Annuler', variant: 'plain', tone: 'neutral' },
      ],
    })

  const row = (challenge: ChallengeView, kind: 'received' | 'sent', index: number, total: number) => {
    const player = kind === 'received' ? challenge.challenger : challenge.opponent
    const topic = topicName(challenge.topic.names)
    const status =
      kind === 'received' ? `expire dans ${duration(Date.parse(challenge.expiresAt) - now)}` : `en attente · ${duration(now - Date.parse(challenge.createdAt))}`
    return (
      <ChallengeListRow
        key={challenge.challengeId}
        name={player.pseudonym}
        premium={identity.premium(player)}
        onPress={identity.open(player.userId)}
        src={avatarSvg(player.avatarOptions, player.userId) ?? undefined}
        sub={`${topic} · ${status}`}
        last={index === total - 1}
        {...(kind === 'received'
          ? {
              primary: {
                label: 'Accepter',
                loading: accept.isPending && accept.variables?.challengeId === challenge.challengeId,
                disabled: accept.isPending,
                onPress: () => accept.mutate(challenge),
              },
              secondary: {
                label: 'Refuser',
                disabled: decline.isPending,
                loading: decline.isPending && Boolean(decline.variables?.includes(challenge.challengeId)),
                onPress: () => decline.mutate([challenge.challengeId]),
              },
            }
          : {
              primaryVariant: 'tinted' as const,
              // Relancer n'existe pas côté BFF (`defis.md` § 5) : visible, inactif.
              primary: { label: 'Relancer', disabled: true },
              secondary: {
                label: 'Annuler',
                disabled: cancel.isPending || challenge.challengeId.startsWith('pending-'),
                loading: cancel.isPending && Boolean(cancel.variables?.includes(challenge.challengeId)),
                onPress: () => cancel.mutate([challenge.challengeId]),
              },
            })}
      />
    )
  }

  const header = (
    <MobileTopBar
      title="Défis"
      right={
        <>
          <NotificationButton />
          <SettingsButton />
        </>
      }
    />
  )

  const overlay = (
    <TopicPickerSheet
      open={pickerOpen}
      onClose={() => setPickerOpen(false)}
      title="Créer un salon privé"
      busy={createRoom.isPending}
      onPick={(topic) => {
        setPickerOpen(false)
        createRoom.mutate(topic)
      }}
    />
  )

  // Chargement, erreur ou aucun défi : un seul écran, sans onglets.
  if (loading || failed || empty)
    return (
      <Screen
        inTabs
        header={header}
        scrollProps={{ refreshControl: <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} /> }}
        contentStyle={{ flexGrow: 1, paddingBottom: tokens.space[7] }}
        overlay={overlay}
      >
        {loading ? (
          <Loading />
        ) : failed ? (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
            <EmptyState
              icon={WarningCircleIcon}
              title="Impossible de charger les défis"
              description="Vérifie ta connexion, puis réessaie."
              action={
                <Button style={{ alignSelf: 'center' }} loading={refreshing} onPress={refresh}>
                  Réessayer
                </Button>
              }
            />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
            <EmptyState
              icon={LightningIcon}
              title="Aucun défi en cours"
              description="Défie un joueur depuis sa fiche, ou crée un salon privé et partage son lien."
              action={
                <View style={{ alignSelf: 'stretch', gap: tokens.space[3] }}>
                  <Button full loading={createRoom.isPending} onPress={() => setPickerOpen(true)}>
                    Créer un salon privé
                  </Button>
                  <Button full variant="tinted" onPress={() => router.navigate('/social')}>
                    Défier un abonné
                  </Button>
                </View>
              }
            />
          </View>
        )}
      </Screen>
    )

  const receivedPage = (
    <DragToLoadMore enabled={receivedSource.hasNextPage} loading={false} onLoadMore={() => receivedSource.fetchNextPage()}>
      <TabLoadMoreScrollView showsVerticalScrollIndicator={false} contentContainerStyle={PAGE}>
        {received.length === 0 ? (
          <EmptyState icon={LightningIcon} title="Aucun défi reçu" description="Les défis que d'autres joueurs t'envoient apparaîtront ici." />
        ) : (
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader
              title="Reçus"
              action={
                <Button variant="plain" tone="destructive" size="S" loading={decline.isPending} onPress={refuseAll}>
                  Tout refuser
                </Button>
              }
            />
            <ListGroup surface="surface">{receivedRows.map((challenge, index) => row(challenge, 'received', index, receivedRows.length))}</ListGroup>
            <FeedFooter {...feedFooterProps(receivedSource)} endLabel="Tu as vu tous les défis reçus" />
          </View>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )

  const sentPage = (
    <TabScrollView showsVerticalScrollIndicator={false} contentContainerStyle={PAGE}>
      {sent.length === 0 ? (
        <EmptyState icon={LightningIcon} title="Aucun défi envoyé" description="Défie un joueur depuis sa fiche ou depuis Social." />
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title="Envoyés" />
          <ListGroup surface="surface">{sent.map((challenge, index) => row(challenge, 'sent', index, sent.length))}</ListGroup>
        </View>
      )}
    </TabScrollView>
  )

  const roomsPage = (
    <TabScrollView showsVerticalScrollIndicator={false} contentContainerStyle={PAGE}>
      {salons.length === 0 ? (
        <EmptyState
          icon={DoorOpenIcon}
          title="Aucun salon ouvert"
          description="Crée un salon privé et partage son lien."
          action={
            <Button style={{ alignSelf: 'center' }} onPress={() => setPickerOpen(true)}>
              Créer un salon privé
            </Button>
          }
        />
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title="Salons ouverts" />
          <ListGroup surface="surface">
            {salons.map((room, index) => (
              <ListRow
                key={room.roomId}
                icon={DoorOpenIcon}
                label={topicName(room.topic.names)}
                sub={`${room.opponent ? `Avec ${room.opponent.pseudonym}` : 'En attente d’un joueur'}${room.expiresAt ? ` · expire dans ${duration(Date.parse(room.expiresAt) - now)}` : ''}`}
                control="chevron"
                disabled={room.roomId.startsWith('pending-')}
                onPress={() =>
                  router.push({
                    pathname: '/room/[roomId]',
                    params: {
                      roomId: room.roomId,
                      topicId: room.topic.topicId,
                      topicName: topicName(room.topic.names),
                      category: room.topic.category ?? '',
                    },
                  })
                }
                last={index === salons.length - 1}
              />
            ))}
          </ListGroup>
        </View>
      )}
    </TabScrollView>
  )

  const content: Record<ChallengesTab, ReactNode> = { received: receivedPage, sent: sentPage, rooms: roomsPage }

  return (
    <Screen inTabs scroll={false} header={header} overlay={overlay}>
      <TabsScrollView
        label="Défis"
        value={tab}
        onChange={setTab}
        onRefresh={refresh}
        // Le nombre suit le libellé (« Reçus · 5 ») ; sans élément, le libellé seul.
        pages={TABS.map((item) => ({ value: item.value, label: counts[item.value] > 0 ? `${item.label} · ${counts[item.value]}` : item.label, content: content[item.value] }))}
      />
    </Screen>
  )
}
