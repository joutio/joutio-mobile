import type { PresenceStatus } from '@joutio/client/api-types'
import { t } from '@/lib/i18n'

/** Présence d'un joueur, telle que la portent `PlayerCardView` et `PlayerProfileView`. */
export interface PresenceLike {
  status: PresenceStatus
  lastSeenAt: string | null
}

/** Dernière présence relative, à la manière du lab : « Il y a 2 h », « Hier », « Il y a 3 j », « Il y a 1 sem. ». */
export function relativeSeen(lastSeenAt: string, now = Date.now()): string {
  const minutes = Math.max(1, Math.round((now - Date.parse(lastSeenAt)) / 60_000))
  if (minutes < 60) return t('presence.minutes', { count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return t('presence.hours', { count: hours })
  const days = Math.round(hours / 24)
  if (days === 1) return t('topic.yesterday')
  if (days < 7) return t('presence.days', { count: days })
  const weeks = Math.round(days / 7)
  if (weeks < 5) return t('presence.weeks', { count: weeks })
  return t('presence.months', { count: Math.max(1, Math.round(days / 30)) })
}

/** `online` / `offline` pour l'`Avatar`. Le BFF ne distingue pas encore « En partie ». */
export const presenceOf = (presence: PresenceLike | null | undefined) => (presence?.status === 'ONLINE' ? 'online' : 'offline')

/** Sous-titre d'une ligne de joueur (Social) : « En ligne » ou la dernière présence. */
export function presenceSub(presence: PresenceLike | null | undefined): string {
  if (presence?.status === 'ONLINE') return t('presence.online')
  if (presence?.lastSeenAt) return relativeSeen(presence.lastSeenAt)
  return t('presence.offline')
}

/** Ligne de présence de la fiche joueur : « En ligne » ou « Dernière présence il y a 2 h ». */
export function presenceLine(presence: PresenceLike | null | undefined): string {
  if (presence?.status === 'ONLINE') return t('presence.online')
  if (presence?.lastSeenAt) {
    const seen = relativeSeen(presence.lastSeenAt)
    return t('presence.seen', { when: `${seen.charAt(0).toLowerCase()}${seen.slice(1)}` })
  }
  return t('presence.offline')
}
