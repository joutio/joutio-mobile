import { useEffect, useRef } from 'react'
import { subscribeStomp } from '../ws'

/** Notification personnelle (`NotificationView` du BFF), poussée sur `/topic/notifications/{userId}`. */
export interface NotificationView {
  notificationId: string
  type: 'FOLLOW' | 'CHALLENGE_RECEIVED' | 'CHALLENGE_DECLINED' | 'ROOM_ACCEPTED' | 'WIZZ' | 'QUESTION_REPORTED' | 'TOPIC_DRAFTED' | 'ACCOUNT_SUSPENDED'
  actorId: string | null
  /** Défi (`CHALLENGE_*`), salle (`ROOM_ACCEPTED`)… */
  sourceId: string | null
  topicId: string | null
  /** Partie d'origine : présent sur un `CHALLENGE_RECEIVED`, c'est une revanche. */
  gameId: string | null
  expiresAt: string | null
  readAt: string | null
  createdAt: string
}

interface Envelope {
  eventType?: string
  payload?: NotificationView
}

/**
 * Flux personnel STOMP du joueur connecté. `handler` reçoit chaque notification créée (les suppressions
 * `NOTIFICATION_DELETED` sont transmises avec `deleted`).
 *
 * Le flux n'a pas d'historique rejouable : ce qui arrive pendant une coupure (app en arrière-plan, réseau) est perdu.
 * `onResync` est donc rappelé à chaque **re**connexion (jamais à la première) pour relire les vues qui en dépendent.
 */
export function usePersonalNotifications(
  userId: string | undefined,
  handler: (notification: NotificationView, deleted: boolean) => void,
  onResync?: () => void,
) {
  const ref = useRef(handler)
  ref.current = handler
  const resync = useRef(onResync)
  resync.current = onResync
  const wantsResync = onResync !== undefined
  useEffect(() => {
    if (!userId) return
    let connected = false
    const onConnect = () => {
      if (connected) resync.current?.()
      connected = true
    }
    return subscribeStomp(`/topic/notifications/${userId}`, (message) => {
      let envelope: Envelope
      try {
        envelope = JSON.parse(message.body) as Envelope
      } catch {
        return
      }
      if (!envelope.payload?.notificationId) return
      ref.current(envelope.payload, envelope.eventType === 'NOTIFICATION_DELETED')
    }, wantsResync ? onConnect : undefined)
  }, [userId, wantsResync])
}
