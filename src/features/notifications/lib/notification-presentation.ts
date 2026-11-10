import type { NotificationView } from '@/lib/realtime/personal-notifications'

/** Libellés de `joutio-web` (`notifications.row`). */
export function notificationTitle(notification: NotificationView, name: string) {
  switch (notification.type) {
    case 'FOLLOW':
      return `${name} s'est abonné à toi`
    case 'CHALLENGE_RECEIVED':
      return notification.gameId ? `${name} te demande une revanche` : `${name} te défie`
    case 'CHALLENGE_DECLINED':
      return `${name} a refusé ton défi`
    case 'ROOM_ACCEPTED':
      return `${name} a accepté ton défi`
    case 'WIZZ':
      return `${name} te demande de rejoindre la salle`
    case 'QUESTION_REPORTED':
      // Anonyme (`notifications.md`) : jamais le signalant.
      return 'Question signalée'
    case 'TOPIC_DRAFTED':
      return 'Ton sujet est repassé en brouillon'
    case 'ACCOUNT_SUSPENDED':
      return 'Ton compte a été suspendu'
    default:
      return 'Notification'
  }
}
