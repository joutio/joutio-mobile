import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { queryKeys } from '@/lib/query-keys'
import { usePersonalNotifications, type NotificationView } from '@/lib/realtime/personal-notifications'
import type { PageResponse } from '@/shared/types/bff'
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
 * polling). Monté une fois, dans le layout des onglets.
 */
export function useNotificationsRealtime() {
  const client = useQueryClient()
  const userId = useMe(true).data?.userId
  usePersonalNotifications(userId, () => {
    void client.invalidateQueries({ queryKey: queryKeys.notifications.all() })
  })
}

/** Applique un changement à la liste et au compteur en cache, restaurés si le BFF refuse. */
function useInboxMutation<V>(run: (value: V) => Promise<unknown>, change: (list: NotificationView[], value: V) => NotificationView[], error: string) {
  const client = useQueryClient()
  const listKey = queryKeys.notifications.list()
  const countKey = queryKeys.notifications.unreadCount()
  return useMutation({
    mutationFn: run,
    onMutate: async (value: V) => {
      await client.cancelQueries({ queryKey: queryKeys.notifications.all() })
      const previous = client.getQueryData<Pages>(listKey)
      const previousCount = client.getQueryData<{ count: number }>(countKey)
      if (previous) {
        const next = { ...previous, pages: previous.pages.map((page) => ({ ...page, content: change(page.content, value) })) }
        client.setQueryData<Pages>(listKey, next)
        const unread = next.pages.flatMap((page) => page.content).filter((item) => item.readAt === null).length
        const before = previous.pages.flatMap((page) => page.content).filter((item) => item.readAt === null).length
        if (previousCount) client.setQueryData(countKey, { count: Math.max(0, previousCount.count - (before - unread)) })
      }
      return { previous, previousCount }
    },
    onError: (_error, _value, context) => {
      if (context?.previous) client.setQueryData(listKey, context.previous)
      if (context?.previousCount) client.setQueryData(countKey, context.previousCount)
      toast.error(error, { description: 'Vérifie ta connexion, puis réessaie.' })
    },
    onSettled: () => void client.invalidateQueries({ queryKey: countKey }),
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
  )
