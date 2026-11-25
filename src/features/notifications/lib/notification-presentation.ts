import type { NotificationView } from '@joutio/client/notifications'
import { t } from '@/lib/i18n'

/** Libellés de `joutio-web` (`notifications.row`). */
export function notificationTitle(notification: NotificationView, name: string) {
  switch (notification.type) {
    case 'FOLLOW':
      return t('mobile.notifications.followed', { name })
    case 'CHALLENGE_RECEIVED':
      return notification.gameId ? t('notifications.rematch', { name }) : t('notifications.challenge', { name })
    case 'CHALLENGE_DECLINED':
      return t('notifications.declined', { name })
    case 'ROOM_ACCEPTED':
      return t('notifications.accepted', { name })
    case 'WIZZ':
      return t('notifications.wizz', { name })
    case 'QUESTION_REPORTED':
      // Anonyme (`notifications.md`) : jamais le signalant.
      return t('result.questionReported')
    case 'TOPIC_DRAFTED':
      return t('notifications.drafted')
    case 'ACCOUNT_SUSPENDED':
      return t('notifications.suspended')
    default:
      return t('mobile.notifications.generic')
  }
}
