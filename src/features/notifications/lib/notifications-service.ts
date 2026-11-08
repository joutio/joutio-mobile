import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { NotificationView } from '@/lib/realtime/personal-notifications'
import type { NotificationTarget } from './notification-target'
import type { PageResponse } from '@/shared/types/bff'

export const NOTIFICATIONS_PAGE_SIZE = 10

/** Boîte de réception (`/api/notifications`). */
export const notificationsService = {
  page: (page: number) => api.get<PageResponse<NotificationView>>(ENDPOINTS.notifications.list, { params: { page, size: NOTIFICATIONS_PAGE_SIZE } }),
  /** Lecture initiale de la cible ; les salles gèrent leur expiration dans RoomScreen. */
  checkTarget: async (target: NotificationTarget) => {
    if (target.kind === 'player') await api.get(ENDPOINTS.profiles.profile(target.id))
    if (target.kind === 'moderation' || target.kind === 'edit-topic') await api.get(ENDPOINTS.topics.questions(target.id), { params: { page: 0, size: 1 } })
  },
  read: (notificationId: string) => api.post<void>(ENDPOINTS.notifications.read(notificationId)),
  readAll: () => api.post<void>(ENDPOINTS.notifications.readAll),
  remove: (notificationId: string) => api.delete<void>(ENDPOINTS.notifications.remove(notificationId)),
  removeAll: () => api.delete<void>(ENDPOINTS.notifications.list),
}

/** Temps écoulé, comme `joutio-web` : « à l'instant », « il y a 12 min », « il y a 3 h », « il y a 2 j », puis la date. */
export function relativeTime(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export type NotificationDay = 'today' | 'week' | 'older'

export const DAY_LABELS: Record<NotificationDay, string> = { today: "Aujourd'hui", week: 'Cette semaine', older: 'Plus ancien' }

export function dayOf(iso: string, now = new Date()): NotificationDay {
  const date = new Date(iso)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (date >= start) return 'today'
  return start.getTime() - date.getTime() < 6 * 24 * 3_600_000 ? 'week' : 'older'
}

export const isExpired = (notification: NotificationView, now = Date.now()) => Boolean(notification.expiresAt && Date.parse(notification.expiresAt) <= now)
export const isUnread = (notification: NotificationView) => notification.readAt === null
