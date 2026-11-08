export interface PushNotice {
  notificationId: string
  userId: string
  type: 'CHALLENGE_RECEIVED' | 'WIZZ'
  sourceId: string | null
  gameId: string | null
  expiresAt: string
}

/** Les données du push n'autorisent aucune URL ni action arbitraire. */
export function parsePushNotice(value: unknown): PushNotice | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (
    typeof data.notificationId !== 'string' ||
    typeof data.userId !== 'string' ||
    (data.type !== 'CHALLENGE_RECEIVED' && data.type !== 'WIZZ') ||
    typeof data.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(data.expiresAt)) ||
    (data.sourceId !== null && typeof data.sourceId !== 'string') ||
    (data.gameId !== null && typeof data.gameId !== 'string')
  )
    return null
  return data as unknown as PushNotice
}

export function pushTarget(notice: PushNotice, now = Date.now()): 'challenges' | 'room' | 'expired' {
  if (Date.parse(notice.expiresAt) <= now) return 'expired'
  return notice.type === 'WIZZ' && notice.sourceId ? 'room' : 'challenges'
}
