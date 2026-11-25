import type { NotificationView } from '@joutio/client/notifications'
import { currentLanguage, formatDate, t } from '@/lib/i18n'

/** Temps écoulé, comme `joutio-web` : « à l'instant », « il y a 12 min », « il y a 3 h », « il y a 2 j », puis la date. */
export function relativeTime(iso: string, now = Date.now()) {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000)
  if (minutes < 1) return t('notifications.justNow')
  if (minutes < 60) return t('mobile.time.minutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('mobile.time.hoursAgo', { n: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return t('mobile.time.daysAgo', { n: days })
  return formatDate(new Date(iso), currentLanguage(), { day: 'numeric', month: 'short' })
}

export type NotificationDay = 'today' | 'week' | 'older'

/** Titre d'un groupe de notifications, dans la langue courante (lu au rendu). */
export const dayGroupLabel = (day: NotificationDay) =>
  t(({ today: 'notifications.today', week: 'notifications.week', older: 'notifications.older' } as const)[day])

export function dayOf(iso: string, now = new Date()): NotificationDay {
  const date = new Date(iso)
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (date >= start) return 'today'
  return start.getTime() - date.getTime() < 6 * 24 * 3_600_000 ? 'week' : 'older'
}

export const isExpired = (notification: NotificationView, now = Date.now()) => Boolean(notification.expiresAt && Date.parse(notification.expiresAt) <= now)
export const isUnread = (notification: NotificationView) => notification.readAt === null
