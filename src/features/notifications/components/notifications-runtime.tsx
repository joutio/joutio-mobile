import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { parseEnvelope, useSubscription } from '@joutio/client/core/realtime'
import type { NotificationView } from '@joutio/client/notifications'
import { toast, useToastStore } from '@/design-system'
import { useSessionUserId } from '@/features/auth'
import { getUserId } from '@/lib/auth'
import { useOpenNotification } from '../hooks/use-open-notification'
import { createNotificationDeduplicator, shouldToast } from '../lib/notification-target'
import { notificationTitle } from '../lib/notification-presentation'
import { parsePushNotice } from '../lib/push-target'
import { useT } from '@/lib/i18n'

/** Notification créée sur le flux personnel (`/topic/notifications/{userId}`) ; les suppressions ne s'affichent pas. */
function readCreated(body: string): NotificationView | undefined {
  const frame = parseEnvelope(body)
  const payload = frame?.payload as Partial<NotificationView> | undefined
  return payload?.notificationId && payload.type && frame?.eventType === payload.type ? (payload as NotificationView) : undefined
}

/**
 * Toasts des notifications reçues, sur tous les écrans connectés. La boîte et la pastille suivent `useJoutioSync` ;
 * ce runtime ne fait qu'annoncer.
 */
export function NotificationsRuntime() {
  const t = useT()
  const userId = useSessionUserId()
  const open = useOpenNotification()
  const dedupe = useRef(createNotificationDeduplicator())
  const notify = (notice: NotificationView) => {
    if (!userId || userId !== getUserId() || !dedupe.current(notice.notificationId)) return
    if (!shouldToast(notice, AppState.currentState === 'active', useToastStore.getState().suspended > 0)) return
    toast.show({
      id: `notification:${notice.notificationId}`,
      title: notificationTitle(notice, t('notifications.somePlayer')),
      onPress: () => {
        void open(notice, userId)
      },
    })
  }
  const latest = useRef(notify)
  latest.current = notify
  useSubscription(userId ? `/topic/notifications/${userId}` : undefined, readCreated, (notice) => latest.current(notice))

  // Secours au premier plan si le flux STOMP est momentanément déconnecté.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const notice = parsePushNotice(notification.request.content.data)
      if (!notice || notice.userId !== userId) return
      latest.current({ ...notice, actorId: null, topicId: null, readAt: null, createdAt: new Date(notification.date).toISOString() })
    })
    return () => subscription.remove()
  }, [userId])
  return null
}
