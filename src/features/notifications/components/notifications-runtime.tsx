import * as Notifications from 'expo-notifications'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import { toast, useToastStore } from '@/design-system'
import { useMe } from '@/features/me'
import { getUserId } from '@/lib/auth'
import type { NotificationView } from '@/lib/realtime/personal-notifications'
import { useNotificationsRealtime } from '../hooks/use-notifications'
import { useOpenNotification } from '../hooks/use-open-notification'
import { createNotificationDeduplicator, shouldToast } from '../lib/notification-target'
import { notificationTitle } from '../lib/notification-presentation'
import { parsePushNotice } from '../lib/push-target'

/** Inbox et toasts sur tous les écrans connectés, y compris hors des onglets. */
export function NotificationsRuntime() {
  const userId = useMe(true).data?.userId
  const open = useOpenNotification()
  const dedupe = useRef(createNotificationDeduplicator())
  const notify = (notice: NotificationView) => {
    if (!userId || userId !== getUserId() || !dedupe.current(notice.notificationId)) return
    if (!shouldToast(notice, AppState.currentState === 'active', useToastStore.getState().suspended > 0)) return
    toast.show({
      id: `notification:${notice.notificationId}`,
      title: notificationTitle(notice, 'Un joueur'),
      onPress: () => {
        void open(notice, userId)
      },
    })
  }
  const latest = useRef(notify)
  latest.current = notify
  useNotificationsRealtime(notify)

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
