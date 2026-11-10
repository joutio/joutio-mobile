import { useGuardedRefresh } from '@/design-system/mobile/guarded-refresh'
import { router } from 'expo-router'
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
} from '@/design-system'
import { useMyChallenges } from '@/features/challenges/hooks/use-challenges'
import { useMe } from '@/features/me'
import type { NotificationView } from '@/lib/realtime/personal-notifications'
import { DAY_LABELS, dayOf, isExpired, type NotificationDay } from '../lib/notifications-service'
import { useDeleteAllNotifications, useMarkAllRead, useNotifications } from '../hooks/use-notifications'
import { NotificationItem } from './notification-item'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'

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
  const { refresh } = useGuardedRefresh(() => list.refetch())
  const { colors } = useTheme()
  const userId = useMe(true).data?.userId ?? ''
  const list = useNotifications()
  const challenges = useMyChallenges(Boolean(userId))
  const readAll = useMarkAllRead()
  const removeAll = useDeleteAllNotifications()
  const items = list.data?.pages.flatMap((page) => page.content) ?? []
  const anyUnread = items.some((item) => item.readAt === null)
  const byChallenge = new Map((challenges.data ?? []).map((challenge) => [challenge.challengeId, challenge]))
  const groups = DAYS.map((day) => ({
    day,
    items: items.filter((item) => dayOf(item.createdAt) === day).sort((a, b) => Number(awaiting(b)) - Number(awaiting(a))),
  })).filter((group) => group.items.length > 0)

  const confirmClear = () =>
    showDialog({
      title: 'Supprimer toutes les notifications ?',
      message: 'Elles disparaîtront de ta boîte. Cette action est définitive.',
      icon: TrashIcon,
      tone: 'danger',
      sheet: true,
      actions: [
        { label: 'Tout supprimer', variant: 'filled', tone: 'destructive', onPress: () => removeAll.mutate() },
        { label: 'Annuler', variant: 'plain', tone: 'neutral' },
      ],
    })

  return (
    <Screen
      scroll={false}
      header={
        <MobileTopBar
          variant="inline"
          back="Accueil"
          onBack={() => router.back()}
          title="Notifications"
          right={
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                icon={ChecksIcon}
                label="Tout marquer comme lu"
                variant="plain"
                tone="accent"
                disabled={!anyUnread}
                onPress={() => readAll.mutate()}
              />
              <IconButton icon={TrashIcon} label="Tout supprimer" variant="plain" tone="destructive" disabled={items.length === 0} onPress={confirmClear} />
            </View>
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: tokens.space[7] }}
          refreshControl={
            <RefreshControl refreshing={list.isRefetching && !list.isFetchingNextPage} onRefresh={refresh} tintColor={colors.muted} />
          }
        >
          {list.isPending ? (
            <View accessibilityLabel="Chargement" style={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} shape="row" style={{ height: 64 }} />
              ))}
            </View>
          ) : list.isError && !list.data ? (
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
              <EmptyState
                icon={WarningCircleIcon}
                title="Impossible de charger tes notifications"
                description="Vérifie ta connexion, puis réessaie."
                action={
                  <Button style={{ alignSelf: 'center' }} loading={list.isRefetching} onPress={() => void list.refetch()}>
                    Réessayer
                  </Button>
                }
              />
            </View>
          ) : items.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER }}>
              <EmptyState icon={BellIcon} title="Aucune notification" description="Tes défis, abonnés et récompenses apparaîtront ici." />
            </View>
          ) : (
            <View style={{ gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
              {groups.map((group) => (
                <View key={group.day} style={{ gap: tokens.space[4] }}>
                  <SectionHeader title={DAY_LABELS[group.day]} />
                  <ListGroup surface="surface">
                    {group.items.map((item, index) => (
                      <NotificationItem
                        key={item.notificationId}
                        notification={item}
                        challenge={item.sourceId ? byChallenge.get(item.sourceId) : undefined}
                        last={index === group.items.length - 1}
                      />
                    ))}
                  </ListGroup>
                </View>
              ))}
              <FeedFooter {...feedFooterProps(pagedQuery(list))} endLabel="Tu as vu toutes tes notifications" />
            </View>
          )}
        </LoadMoreScrollView>
      </DragToLoadMore>
    </Screen>
  )
}
