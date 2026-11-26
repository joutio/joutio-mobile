import { useGuardedRefresh } from '@/design-system/mobile/guarded-refresh'
import { useReadAllNotifications, useNotifications, type NotificationView, useRemoveAllNotifications } from '@joutio/client/notifications'
import { useMyRooms, type RoomView } from '@joutio/client/rooms'
import { useSessionUserId } from '@/features/auth'
import { router } from '@/shared/navigation/router'
import { RefreshControl, View } from 'react-native'
import {
  BellIcon,
  Button,
  ChecksIcon,
  DragToLoadMore,
  EmptyState,
  FeedFooter,
  IconButton,
  ListGroup,
  LoadMoreScrollView,
  MobileTopBar,
  Screen,
  SectionHeader,
  showDialog,
  Skeleton,
  tokens,
  TrashIcon,
  useTheme,
  WarningCircleIcon,
  tabBarScrollInsets,
  useTabBarInset,
  toast,
} from '@/design-system'
import { dayGroupLabel, dayOf, isExpired, type NotificationDay } from '../lib/notification-format'
import { NotificationItem } from './notification-item'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'
import { useT } from '@/lib/i18n'

const GUTTER = tokens.space[5]
const DAYS: NotificationDay[] = ['today', 'week', 'older']

/** Défi reçu encore à jouer : il remonte en tête de sa section, seul à attendre une réponse. */
const awaiting = (item: NotificationView) => item.type === 'CHALLENGE_RECEIVED' && item.readAt === null && !isExpired(item)

/**
 * Notifications (`design/specs/screens/notifications.md`) : écran poussé par la cloche, sections Aujourd'hui / Cette
 * semaine / Plus ancien (sans section vide), 10 par page avec `FeedFooter`. Tout marquer comme lu et Tout supprimer
 * (confirmé) dans la barre ; balayer une ligne la supprime.
 */
export function NotificationsScreen() {
  const t = useT()
  // Fin de liste au-dessus de la tab bar native iOS (`useTabBarInset`).
  const tabInset = useTabBarInset()
  const { colors } = useTheme()
  const list = useNotifications()
  // Le spinner suit ce geste et non la requête : une notification reçue en temps réel relit la boîte sans le faire
  // apparaître seul.
  const { refreshing, refresh } = useGuardedRefresh(() => list.refetch())
  const rooms = useMyRooms(useSessionUserId())
  const readAll = useReadAllNotifications()
  const removeAll = useRemoveAllNotifications()
  const clearAll = () =>
    removeAll.mutate(undefined, {
      onError: () => toast.error(t('notifications.deleteAllError'), { description: t('home.errorText') }),
    })
  // Pagination par numéro de page : une notification peut figurer à la fin d'une page et au début de la suivante.
  const seen = new Set<string>()
  const items = (list.data?.pages.flatMap((page) => page.content) ?? []).filter((item) => !seen.has(item.notificationId) && seen.add(item.notificationId))
  const anyUnread = items.some((item) => item.readAt === null)
  // Un défi reçu est une salle `INVITED` : la notification porte son `roomId`.
  const byRoom = new Map<string, RoomView>((rooms.data ?? []).map((room) => [room.roomId, room]))
  const groups = DAYS.map((day) => ({
    day,
    items: items.filter((item) => dayOf(item.createdAt) === day).sort((a, b) => Number(awaiting(b)) - Number(awaiting(a))),
  })).filter((group) => group.items.length > 0)

  const confirmClear = () =>
    showDialog({
      title: t('notifications.clearTitle'),
      message: t('notifications.clearText'),
      icon: TrashIcon,
      tone: 'danger',
      sheet: true,
      actions: [
        { label: t('notifications.clear'), variant: 'filled', tone: 'destructive', onPress: clearAll },
        { label: t('topic.cancel'), variant: 'plain', tone: 'neutral' },
      ],
    })

  return (
    <Screen
      inTabs
      scroll={false}
      header={
        <MobileTopBar
          variant="inline"
          back={t('nav.home')}
          onBack={() => router.back()}
          title={t('home.notifications')}
          right={
            <>
              <IconButton
                icon={ChecksIcon}
                label={t('notifications.readAll')}
                variant="plain"
                tone="accent"
                disabled={!anyUnread}
                onPress={() => readAll.mutate(undefined, { onError: () => toast.error(t('notifications.readAllError'), { description: t('home.errorText') }) })}
              />
              <IconButton
                icon={TrashIcon}
                label={t('notifications.clear')}
                variant="plain"
                tone="destructive"
                disabled={items.length === 0}
                onPress={confirmClear}
              />
            </>
          }
        />
      }
    >
      <DragToLoadMore
        enabled={Boolean(list.hasNextPage) && !list.isFetchNextPageError}
        loading={list.isFetchingNextPage}
        onLoadMore={() => list.fetchNextPage()}
      >
        <LoadMoreScrollView
          {...tabBarScrollInsets(tabInset)}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: tokens.space[7] }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
        >
          {list.isPending ? (
            <View accessibilityLabel={t('home.loading')} style={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} shape="row" style={{ height: 64 }} />
              ))}
            </View>
          ) : list.isError && !list.isFetchNextPageError ? (
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
              <EmptyState
                icon={WarningCircleIcon}
                title={t('notifications.errorTitle')}
                description={t('home.errorText')}
                action={
                  <Button style={{ alignSelf: 'center' }} loading={list.isRefetching} onPress={() => void list.refetch()}>
                    {t('callback.retry')}
                  </Button>
                }
              />
            </View>
          ) : items.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
              <EmptyState icon={BellIcon} title={t('notifications.emptyTitle')} description={t('notifications.emptyText')} />
            </View>
          ) : (
            <View style={{ gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
              {groups.map((group) => (
                <View key={group.day} style={{ gap: tokens.space[4] }}>
                  <SectionHeader title={dayGroupLabel(group.day)} />
                  <ListGroup surface="surface">
                    {group.items.map((item, index) => (
                      <NotificationItem
                        key={item.notificationId}
                        notification={item}
                        room={item.sourceId ? byRoom.get(item.sourceId) : undefined}
                        last={index === group.items.length - 1}
                      />
                    ))}
                  </ListGroup>
                </View>
              ))}
              <FeedFooter {...feedFooterProps(pagedQuery(list))} endLabel={t('notifications.end')} />
            </View>
          )}
        </LoadMoreScrollView>
      </DragToLoadMore>
    </Screen>
  )
}
