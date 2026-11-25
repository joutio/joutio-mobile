import { NotificationButton } from '@/features/notifications/components/notification-button'
import { SettingsButton } from '@/features/settings/components/settings-button'
import {
  invitationReminderDelay,
  useAcceptInvitation,
  useCancelRooms,
  useDeclineInvitations,
  useDefis,
  useRemindRoom,
  type RoomView,
} from '@joutio/client/rooms'
import { router } from '@/shared/navigation/router'
import { useLocalSearchParams } from 'expo-router'
import { useEffect, useState, type ReactNode } from 'react'
import { RefreshControl, View } from 'react-native'
import {
  Button,
  ChallengeListRow,
  DoorOpenIcon,
  SwordIcon,
  DragToLoadMore,
  EmptyState,
  FeedFooter,
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
  toast,
  useTheme,
  WarningCircleIcon,
} from '@/design-system'
import { usePlayerIdentity } from '@/features/me'
import { useCreatePrivateRoom } from '@/features/play/hooks/use-play'
import { readServerNow } from '@/lib/realtime/server-clock'
import { TopicPickerSheet } from '@/features/topics/components/topic-picker-sheet'
import { avatarSvg } from '@/shared/utils/avatar'
import { topicName } from '@/shared/utils/topic-name'
import { duration } from '../lib/duration'
import { clientSource, feedFooterProps } from '@/shared/utils/paging'
import type { ChallengesTab } from '@/features/notifications/lib/notification-target'
import { t, useT } from '@/lib/i18n'

const GUTTER = tokens.space[5]
/** Reçus : liste paginée, 10 par page. */
const RECEIVED_PAGE = 10
const TABS = (): readonly { value: ChallengesTab; label: string }[] => [
  { value: 'received', label: t('challenges.received') },
  { value: 'sent', label: t('challenges.sent') },
  { value: 'rooms', label: t('challenges.rooms') },
]
/** Onglet Salons, deux sections selon l'origine (`defis.md` § 1) : défis acceptés (défi, revanche, appariement), salons privés. */
const byOrigin = (rooms: readonly RoomView[]) => ({
  challenges: rooms.filter((room) => room.origin !== 'SHARED'),
  shared: rooms.filter((room) => room.origin === 'SHARED'),
})

const PAGE = { gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[4], paddingBottom: tokens.space[7] }

function Loading() {
  const t = useT()
  return (
    <View accessibilityLabel={t('home.loading')} style={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
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
  const t = useT()
  const identity = usePlayerIdentity()
  const { colors } = useTheme()
  const defis = useDefis()
  const accept = useAcceptInvitation()
  const decline = useDeclineInvitations()
  const cancel = useCancelRooms()
  const remind = useRemindRoom()
  const createRoom = useCreatePrivateRoom()
  const [tab, setTab] = useState<ChallengesTab>('received')
  // Onglet demandé par une notification : appliqué puis effacé, pour qu'une même demande rejoue plus tard.
  const params = useLocalSearchParams<{ tab?: string }>()
  useEffect(() => {
    const requested = TABS().find((item) => item.value === params.tab)?.value
    if (!requested) return
    setTab(requested)
    router.setParams({ tab: undefined })
  }, [params.tab])
  const [receivedPages, setReceivedPages] = useState(1)
  const [pickerOpen, setPickerOpen] = useState(false)

  const received = defis.data?.received ?? []
  const sent = defis.data?.sent ?? []
  const salons = defis.data?.waiting ?? []
  const roomSections = byOrigin(salons)
  const now = readServerNow()
  // Décompte des relances (10 min) : l'écran se re-rend toutes les 15 s tant qu'un défi envoyé attend sa relance.
  const remindPending = sent.some((room) => invitationReminderDelay(room, now) > 0)
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!remindPending) return
    const timer = setInterval(() => setTick((tick) => tick + 1), 15_000)
    return () => clearInterval(timer)
  }, [remindPending])
  const loading = defis.isPending
  const failed = defis.isError
  const empty = !loading && !failed && received.length + sent.length + salons.length === 0
  const receivedRows = received.slice(0, receivedPages * RECEIVED_PAGE)
  const receivedSource = clientSource(receivedPages, setReceivedPages, receivedRows.length < received.length)
  const counts: Record<ChallengesTab, number> = { received: received.length, sent: sent.length, rooms: salons.length }

  // Relecture des salles (défis compris). Les onglets la passent telle quelle à `TabsScrollView`, qui la garde lui-même
  // (`usePageRefresh`) : lui passer `refresh`, déjà gardé et sans promesse, arrêtait l'indicateur aussitôt.
  const reload = () => defis.refetch()
  const declineAll = (roomIds: string[]) =>
    decline.mutate(roomIds, { onError: () => toast.error(t('challenges.declineError'), { description: t('challenges.retryText') }) })
  const openRoom = (room: RoomView) =>
    router.push({
      pathname: '/room/[roomId]',
      params: { roomId: room.roomId, topicId: room.topic.topicId, topicName: topicName(room.topic.names), category: room.topic.category ?? '' },
    })
  // Accepter ouvre aussitôt la salle du défi (même `roomId`) ; un refus du serveur s'affiche en toast.
  const acceptInvitation = (room: RoomView) => {
    accept.mutate(room.roomId, { onError: () => toast.error(t('challenges.acceptError')) })
    openRoom(room)
  }
  const { refreshing, refresh } = useGuardedRefresh(reload)

  const refuseAll = () =>
    showDialog({
      title: t('challenges.refuseAllTitle', { count: received.length }),
      message: t('challenges.refuseAllText'),
      icon: LightningIcon,
      tone: 'danger',
      actions: [
        {
          label: t('challenges.refuseAll'),
          variant: 'filled',
          tone: 'destructive',
          onPress: () => declineAll(received.map((room) => room.roomId)),
        },
        { label: t('topic.cancel'), variant: 'plain', tone: 'neutral' },
      ],
    })

  const row = (room: RoomView, kind: 'received' | 'sent', index: number, total: number) => {
    const player = room.opponent
    const topic = topicName(room.topic.names)
    const status =
      kind === 'received'
        ? t('challenges.expiresIn', { duration: duration(Date.parse(room.expiresAt) - now) })
        : t('challenges.waiting', { duration: duration(now - Date.parse(room.createdAt)) })
    const remindIn = invitationReminderDelay(room, now)
    return (
      <ChallengeListRow
        key={room.roomId}
        name={player?.pseudonym ?? t('topic.opponent')}
        premium={identity.premium(player)}
        onPress={identity.open(player?.userId)}
        src={player ? (avatarSvg(player.avatarOptions, player.userId) ?? undefined) : undefined}
        sub={`${topic} · ${status}`}
        last={index === total - 1}
        {...(kind === 'received'
          ? {
              primary: {
                label: t('challenges.accept'),
                loading: accept.isPending && accept.variables === room.roomId,
                disabled: accept.isPending,
                onPress: () => acceptInvitation(room),
              },
              secondary: {
                label: t('challenges.decline'),
                disabled: decline.isPending,
                loading: decline.isPending && Boolean(decline.variables?.includes(room.roomId)),
                onPress: () => declineAll([room.roomId]),
              },
            }
          : {
              primaryVariant: 'tinted' as const,
              // Relance au plus toutes les 10 min (`defis.md` § 5) : le décompte s'affiche dans le bouton.
              primary: {
                label: remindIn > 0 ? t('challenges.remindIn', { duration: duration(remindIn) }) : t('challenges.remind'),
                loading: remind.isPending && remind.variables === room.roomId,
                disabled: remindIn > 0 || remind.isPending,
                onPress: () =>
                  remind.mutate(room.roomId, {
                    onSuccess: () => toast.success(t('challenges.reminded')),
                    onError: () => toast.error(t('challenges.remindError'), { description: t('challenges.retryText') }),
                  }),
              },
              secondary: {
                label: t('topic.cancel'),
                disabled: cancel.isPending,
                loading: cancel.isPending && Boolean(cancel.variables?.includes(room.roomId)),
                onPress: () =>
                  cancel.mutate([room.roomId], { onError: () => toast.error(t('challenges.cancelError'), { description: t('challenges.retryText') }) }),
              },
            })}
      />
    )
  }

  const header = (
    <MobileTopBar
      title={t('nav.challenges')}
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
      title={t('challenges.createRoom')}
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
              title={t('challenges.errorTitle')}
              description={t('home.errorText')}
              action={
                <Button style={{ alignSelf: 'center' }} loading={refreshing} onPress={refresh}>
                  {t('callback.retry')}
                </Button>
              }
            />
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
            <EmptyState
              icon={LightningIcon}
              title={t('challenges.emptyTitle')}
              description={t('challenges.emptyText')}
              action={
                <View style={{ alignSelf: 'stretch', gap: tokens.space[3] }}>
                  <Button full loading={createRoom.isPending} onPress={() => setPickerOpen(true)}>
                    {t('challenges.createRoom')}
                  </Button>
                  <Button full variant="tinted" onPress={() => router.navigate('/social')}>
                    {t('challenges.challengeFollowed')}
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
          <EmptyState icon={LightningIcon} title={t('challenges.noReceived')} description={t('challenges.noReceivedText')} />
        ) : (
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader
              title={t('challenges.received')}
              action={
                <Button variant="plain" tone="destructive" size="S" loading={decline.isPending} onPress={refuseAll}>
                  {t('challenges.refuseAll')}
                </Button>
              }
            />
            <ListGroup surface="surface">{receivedRows.map((room, index) => row(room, 'received', index, receivedRows.length))}</ListGroup>
            <FeedFooter {...feedFooterProps(receivedSource)} endLabel={t('challenges.receivedEnd')} />
          </View>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )

  const sentPage = (
    <TabScrollView showsVerticalScrollIndicator={false} contentContainerStyle={PAGE}>
      {sent.length === 0 ? (
        <EmptyState icon={LightningIcon} title={t('challenges.noSent')} description={t('challenges.noSentText')} />
      ) : (
        <View style={{ gap: tokens.space[4] }}>
          <SectionHeader title={t('challenges.sent')} />
          <ListGroup surface="surface">{sent.map((room, index) => row(room, 'sent', index, sent.length))}</ListGroup>
        </View>
      )}
    </TabScrollView>
  )

  const roomsPage = (
    <TabScrollView showsVerticalScrollIndicator={false} contentContainerStyle={PAGE}>
      {salons.length === 0 ? (
        <EmptyState
          icon={DoorOpenIcon}
          title={t('challenges.noRoom')}
          description={t('challenges.noRoomText')}
          action={
            <Button style={{ alignSelf: 'center' }} onPress={() => setPickerOpen(true)}>
              {t('challenges.createRoom')}
            </Button>
          }
        />
      ) : (
        <View style={{ gap: tokens.space[6] }}>
          {(
            [
              ['challenges.acceptedChallenges', roomSections.challenges],
              ['challenges.privateRooms', roomSections.shared],
            ] as const
          ).map(([title, list]) =>
            list.length === 0 ? null : (
              <View key={title} style={{ gap: tokens.space[4] }}>
                <SectionHeader title={t(title)} />
                <ListGroup surface="surface">
                  {list.map((room, index) => (
                    <ListRow
                      key={room.roomId}
                      icon={room.origin === 'SHARED' ? DoorOpenIcon : SwordIcon}
                      label={topicName(room.topic.names)}
                      sub={(() => {
                        const opponent = room.opponent ? t('challenges.roomWith', { name: room.opponent.pseudonym }) : t('challenges.roomWaiting')
                        const who = room.origin === 'REMATCH' ? `${t('result.rematch')} · ${opponent}` : opponent
                        return room.expiresAt ? t('challenges.roomSub', { who, duration: duration(Date.parse(room.expiresAt) - now) }) : who
                      })()}
                      control="chevron"
                      onPress={() => openRoom(room)}
                      last={index === list.length - 1}
                    />
                  ))}
                </ListGroup>
              </View>
            ),
          )}
        </View>
      )}
    </TabScrollView>
  )

  const content: Record<ChallengesTab, ReactNode> = { received: receivedPage, sent: sentPage, rooms: roomsPage }

  return (
    <Screen inTabs scroll={false} header={header} overlay={overlay}>
      <TabsScrollView
        label={t('nav.challenges')}
        value={tab}
        onChange={setTab}
        onRefresh={reload}
        // Le nombre suit le libellé (« Reçus · 5 ») ; sans élément, le libellé seul.
        pages={TABS().map((item) => ({
          value: item.value,
          label: counts[item.value] > 0 ? t('common.labelCount', { label: item.label, count: counts[item.value] }) : item.label,
          content: content[item.value],
        }))}
      />
    </Screen>
  )
}
