import type { NotificationView } from '@joutio/client/notifications'

export type NotificationLink = Pick<NotificationView, 'notificationId' | 'type' | 'sourceId' | 'gameId' | 'expiresAt'> &
  Partial<Pick<NotificationView, 'actorId' | 'topicId'>>
export type NotificationTarget =
  | { kind: 'player'; id: string }
  | { kind: 'challenges'; tab: ChallengesTab }
  | { kind: 'room'; id: string }
  | { kind: 'moderation'; id: string; reportId?: string }
  | { kind: 'edit-topic'; id: string }
  | { kind: 'suspended' }
  /** Informative : marquée lue, rien ne s'ouvre. */
  | { kind: 'none' }
  /** `challenges` : onglet de Défis où retomber, `null` hors invitation. */
  | { kind: 'fallback'; challenges: ChallengesTab | null; expired: boolean }

/** Onglets de Défis (`defis.md`, 2026-11-14), Reçus par défaut. */
export type ChallengesTab = 'received' | 'sent' | 'rooms'

/**
 * Onglet de Défis d'une invitation (`notifications.md` § 2, 2026-11-14) : défi reçu ou relance → Reçus. `null` : la
 * notification ne concerne pas les défis.
 */
const INVITATIONS: Partial<Record<string, ChallengesTab>> = {
  CHALLENGE_RECEIVED: 'received',
  WIZZ: 'received',
}

/**
 * Notifications sans écran d'action (2026-11-14) : défi accepté et défi refusé ne font qu'informer. Le toucher les marque
 * lues, sans redirection ni chevron.
 */
const INFORMATIVE = new Set<string>(['ROOM_ACCEPTED', 'CHALLENGE_DECLINED'])

/** Vrai si toucher la notification ouvre un écran (chevron de la ligne). */
export const opensScreen = (type: string) => !INFORMATIVE.has(type)

/** Même destination pour l'inbox, les toasts et les push ; aucune URL fournie par le payload. */
export function notificationTarget(notice: NotificationLink, now = Date.now()): NotificationTarget {
  const fallback: NotificationTarget = {
    kind: 'fallback',
    challenges: INVITATIONS[notice.type] ?? null,
    expired: Boolean(notice.expiresAt && Date.parse(notice.expiresAt) <= now),
  }
  if (INFORMATIVE.has(notice.type)) return { kind: 'none' }
  if (fallback.expired) return fallback
  switch (notice.type) {
    case 'FOLLOW':
      return notice.actorId ? { kind: 'player', id: notice.actorId } : fallback
    case 'CHALLENGE_RECEIVED':
      return { kind: 'challenges', tab: 'received' }
    case 'WIZZ':
      return notice.sourceId ? { kind: 'room', id: notice.sourceId } : fallback
    case 'QUESTION_REPORTED':
      return notice.topicId ? { kind: 'moderation', id: notice.topicId, ...(notice.sourceId ? { reportId: notice.sourceId } : {}) } : fallback
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
