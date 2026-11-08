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
    !data.notificationId ||
    typeof data.userId !== 'string' ||
    !data.userId ||
    (data.type !== 'CHALLENGE_RECEIVED' && data.type !== 'WIZZ') ||
    typeof data.expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(data.expiresAt)) ||
    (data.sourceId != null && typeof data.sourceId !== 'string') ||
    (data.gameId != null && typeof data.gameId !== 'string')
  )
    return null
  return {
    notificationId: data.notificationId,
    userId: data.userId,
    type: data.type,
    sourceId: typeof data.sourceId === 'string' && data.sourceId ? data.sourceId : null,
    gameId: typeof data.gameId === 'string' && data.gameId ? data.gameId : null,
    expiresAt: data.expiresAt,
  }
}
