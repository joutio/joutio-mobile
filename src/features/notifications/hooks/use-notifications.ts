import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { optimisticUpdate } from '@/lib/optimistic-cache'
import { queryKeys } from '@/lib/query-keys'
import { usePersonalNotifications, type NotificationView } from '@/lib/realtime/personal-notifications'
import type { PageResponse } from '@joutio/client-domain/api-types'
import { NOTIFICATIONS_PAGE_SIZE, notificationsService } from '../lib/notifications-service'

type Pages = InfiniteData<PageResponse<NotificationView>, number>

/** Boîte de réception, 10 par page, du plus récent au plus ancien. */
export function useNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ pageParam }) => notificationsService.page(pageParam),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    staleTime: 15_000,
    meta: { pageSize: NOTIFICATIONS_PAGE_SIZE },
  })
}

/**
 * Flux personnel STOMP : une notification créée ou supprimée rafraîchit la boîte et le compteur de la cloche (aucun
 * polling). Monté une fois, dans le runtime des écrans connectés.
 */
export function useNotificationsRealtime(onCreated?: (notification: NotificationView) => void) {
  const client = useQueryClient()
  const userId = useMe(true).data?.userId
  usePersonalNotifications(userId, (notification, deleted) => {
    if (!deleted) {
      onCreated?.(notification)
      void client.invalidateQueries({ queryKey: queryKeys.notifications.all() })
      return
    }
    const data = client.getQueryData<Pages>(queryKeys.notifications.list())
    const existing = data?.pages.flatMap((page) => page.content).find((item) => item.notificationId === notification.notificationId)
    if (!existing) return // Already removed locally, or outside the loaded pages.
    client.setQueryData<Pages>(queryKeys.notifications.list(), (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              content: page.content.filter((item) => item.notificationId !== notification.notificationId),
              totalElements: Math.max(0, page.totalElements - 1),
            })),
          }
        : data,
    )
    if (existing.readAt === null)
      client.setQueryData<{ count: number }>(queryKeys.notifications.unreadCount(), (count) => (count ? { count: Math.max(0, count.count - 1) } : count))
  }, () => void client.invalidateQueries({ queryKey: queryKeys.notifications.all() }))
}

/** Applique un changement à la liste et au compteur en cache, restaurés si le BFF refuse. */
function useInboxMutation<V>(
  run: (value: V) => Promise<unknown>,
  change: (list: NotificationView[], value: V) => NotificationView[],
  error: string,
  all: false | 'read' | 'delete' = false,
) {
  const client = useQueryClient()
  const listKey = queryKeys.notifications.list()
  const countKey = queryKeys.notifications.unreadCount()
  return useMutation({
    mutationFn: run,
    onMutate: (value: V) =>
      optimisticUpdate(client, [queryKeys.notifications.all()], () => {
        const previous = client.getQueryData<Pages>(listKey)
        const previousCount = client.getQueryData<{ count: number }>(countKey)
        if (previous) {
          const contents = previous.pages.map((page) => change(page.content, value))
          const removed = previous.pages.reduce((sum, page, index) => sum + page.content.length - (contents[index]?.length ?? 0), 0)
          const next = {
            ...previous,
            pages: previous.pages.map((page, index) => ({
              ...page,
              content: contents[index] ?? [],
              totalElements: all === 'delete' ? 0 : Math.max(0, page.totalElements - removed),
              totalPages: all === 'delete' ? 0 : Math.ceil(Math.max(0, page.totalElements - removed) / page.size),
              last: all === 'delete' ? true : page.last,
            })),
          }
          client.setQueryData<Pages>(listKey, next)
          const unread = next.pages.flatMap((page) => page.content).filter((item) => item.readAt === null).length
          const before = previous.pages.flatMap((page) => page.content).filter((item) => item.readAt === null).length
          if (previousCount) client.setQueryData(countKey, { count: all ? 0 : Math.max(0, previousCount.count - (before - unread)) })
        } else if (all) client.setQueryData(countKey, { count: 0 })
      }),
    onError: (_error, _value, context) => {
      context?.rollback()
      toast.error(error, { description: 'Vérifie ta connexion, puis réessaie.' })
    },
  })
}

const now = () => new Date().toISOString()

export const useMarkRead = () =>
  useInboxMutation(
    (id: string) => notificationsService.read(id),
    (list, id) => list.map((item) => (item.notificationId === id && item.readAt === null ? { ...item, readAt: now() } : item)),
    "La notification n'a pas pu être marquée comme lue",
  )

export const useMarkAllRead = () =>
  useInboxMutation(
    (_: void) => notificationsService.readAll(),
    (list) => list.map((item) => (item.readAt === null ? { ...item, readAt: now() } : item)),
    "Les notifications n'ont pas pu être marquées comme lues",
    'read',
  )

export const useDeleteNotification = () =>
  useInboxMutation(
    (id: string) => notificationsService.remove(id),
    (list, id) => list.filter((item) => item.notificationId !== id),
    "La notification n'a pas pu être supprimée",
  )

export const useDeleteAllNotifications = () =>
  useInboxMutation(
    (_: void) => notificationsService.removeAll(),
    () => [],
    "Les notifications n'ont pas pu être supprimées",
    'delete',
  )
