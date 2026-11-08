import * as Notifications from 'expo-notifications'
import { router, useRootNavigationState, useSegments } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { useSessionStore } from '@/features/auth/session-store'
import { useMe } from '@/features/me'
import { getUserId, onBeforeSessionClear } from '@/lib/auth'
import { useOpenNotification } from '../hooks/use-open-notification'
import { syncExpoPush, unregisterExpoPush } from '../lib/expo-push'
import { createNotificationDeduplicator } from '../lib/notification-target'
import { parsePushNotice, type PushNotice } from '../lib/push-target'

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
})

export function ExpoPushRuntime() {
  const ready = useSessionStore((state) => state.ready)
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(ready && authenticated)
  const navigation = useRootNavigationState()
  const segments = useSegments() as string[]
  const inApp = segments[0] === '(app)'
  const outsidePlayerFlow = segments[0] === '(dev)' || segments[0] === 'join'
  const open = useOpenNotification()
  const [pending, setPending] = useState<PushNotice | null>(null)
  const receiveOnce = useRef(createNotificationDeduplicator())
  const responseEpoch = useRef(0)

  useEffect(
    () =>
      onBeforeSessionClear(async (reason) => {
        responseEpoch.current++
        setPending(null)
        await Notifications.clearLastNotificationResponseAsync().catch(() => undefined)
        await unregisterExpoPush(reason === undefined)
      }),
    [],
  )

  useEffect(() => {
    let active = true
    let liveResponse = false
    const epoch = responseEpoch.current
    const receive = (response: Notifications.NotificationResponse) => {
      if (!active || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return
      const notice = parsePushNotice(response.notification.request.content.data)
      if (notice && receiveOnce.current(notice.notificationId)) setPending(notice)
    }
    // Écouter d'abord : la lecture du dernier clic ne doit pas écraser un nouveau clic.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      liveResponse = true
      receive(response)
    })
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response && !liveResponse && responseEpoch.current === epoch) receive(response)
      })
      .catch(() => undefined)
    return () => {
      active = false
      subscription.remove()
    }
  }, [])

  useEffect(() => {
    if (!ready || !authenticated) return
    const sync = () => {
      void syncExpoPush().catch(() => undefined)
    }
    sync()
    const state = AppState.addEventListener('change', (next) => {
      if (next === 'active') sync()
    })
    const token = Notifications.addPushTokenListener(sync)
    return () => {
      state.remove()
      token.remove()
    }
  }, [ready, authenticated])

  useEffect(() => {
    // Attendre la fin de la redirection initiale et le montage du parcours joueur.
    if (!pending || !ready || !navigation?.key || !authenticated || !me.data?.onboardingCompleted) return
    if (me.data.userId !== getUserId()) return
    if (pending.userId === getUserId() && outsidePlayerFlow) {
      router.replace('/home')
      return
    }
    if (!inApp) return
    setPending(null)
    void Notifications.clearLastNotificationResponseAsync().catch(() => undefined)
    if (pending.userId === getUserId()) void open(pending, pending.userId)
  }, [pending, ready, navigation?.key, authenticated, me.data?.userId, me.data?.onboardingCompleted, inApp, outsidePlayerFlow, open])
  return null
}
