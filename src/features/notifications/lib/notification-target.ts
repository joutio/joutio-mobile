import type { NotificationView } from '@/lib/realtime/personal-notifications'

export type NotificationLink = Pick<NotificationView, 'notificationId' | 'type' | 'sourceId' | 'gameId' | 'expiresAt'> &
  Partial<Pick<NotificationView, 'actorId' | 'topicId'>>
export type NotificationTarget =
  | { kind: 'player'; id: string }
  | { kind: 'challenges' }
  | { kind: 'room'; id: string }
  | { kind: 'moderation'; id: string }
  | { kind: 'edit-topic'; id: string }
  | { kind: 'suspended' }
  | { kind: 'fallback'; challenges: boolean; expired: boolean }

const isInvitation = (notice: NotificationLink) => ['CHALLENGE_RECEIVED', 'CHALLENGE_DECLINED', 'ROOM_ACCEPTED', 'WIZZ'].includes(notice.type)

/** Même destination pour l'inbox, les toasts et les push ; aucune URL fournie par le payload. */
export function notificationTarget(notice: NotificationLink, now = Date.now()): NotificationTarget {
  const fallback: NotificationTarget = {
    kind: 'fallback',
    challenges: isInvitation(notice),
    expired: Boolean(notice.expiresAt && Date.parse(notice.expiresAt) <= now),
  }
  if (fallback.expired) return fallback
  switch (notice.type) {
    case 'FOLLOW':
    case 'CHALLENGE_DECLINED':
      return notice.actorId ? { kind: 'player', id: notice.actorId } : fallback
    case 'CHALLENGE_RECEIVED':
      return { kind: 'challenges' }
    case 'ROOM_ACCEPTED':
    case 'WIZZ':
      return notice.sourceId ? { kind: 'room', id: notice.sourceId } : fallback
    case 'QUESTION_REPORTED':
      return notice.topicId ? { kind: 'moderation', id: notice.topicId } : fallback
    case 'TOPIC_DRAFTED':
      return notice.topicId ? { kind: 'edit-topic', id: notice.topicId } : fallback
    case 'ACCOUNT_SUSPENDED':
      return { kind: 'suspended' }
    default:
      return fallback
  }
}

/** Mémoire bornée commune aux réceptions Expo et STOMP. Un runtime est recréé pour chaque compte. */
export function createNotificationDeduplicator(limit = 256) {
  const seen = new Set<string>()
  return (id: string) => {
    if (seen.has(id)) return false
    seen.add(id)
    if (seen.size > limit) seen.delete(seen.values().next().value!)
    return true
  }
}

export function shouldToast(notice: NotificationLink & Partial<Pick<NotificationView, 'readAt'>>, active: boolean, immersive: boolean, now = Date.now()) {
  return (
    active &&
    !immersive &&
    notice.readAt == null &&
    !(notice.expiresAt && Date.parse(notice.expiresAt) <= now) &&
    !(notice.type === 'CHALLENGE_RECEIVED' && notice.gameId)
  )
}
