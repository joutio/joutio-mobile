import * as Notifications from 'expo-notifications'
import { router, useRootNavigationState } from 'expo-router'
import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { toast } from '@/design-system'
import { useSessionStore } from '@/features/auth/session-store'
import { useMe } from '@/features/me'
import { getUserId, onBeforeSessionClear } from '@/lib/auth'
import { useEntryStore } from '@/shared/stores/entry-store'
import { syncExpoPush, unregisterExpoPush } from '../lib/expo-push'
import { parsePushNotice, pushTarget, type PushNotice } from '../lib/push-target'

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
})

export function ExpoPushRuntime() {
  const ready = useSessionStore((state) => state.ready)
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(ready && authenticated)
  const navigation = useRootNavigationState()
  const [pending, setPending] = useState<PushNotice | null>(null)

  useEffect(() => onBeforeSessionClear((reason) => unregisterExpoPush(reason === undefined)), [])

  useEffect(() => {
    const receive = (response: Notifications.NotificationResponse) => {
      const notice = parsePushNotice(response.notification.request.content.data)
      if (notice) {
        useEntryStore.getState().enter()
        setPending(notice)
      }
    }
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) receive(response)
      })
      .catch(() => undefined)
    const subscription = Notifications.addNotificationResponseReceivedListener(receive)
    return () => subscription.remove()
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
    if (!pending || !navigation?.key || !authenticated || !me.data?.onboardingCompleted) return
    setPending(null)
    void Notifications.clearLastNotificationResponseAsync()
    if (pending.userId !== getUserId()) return
    const target = pushTarget(pending)
    if (target === 'room' && pending.sourceId) router.push({ pathname: '/room/[roomId]', params: { roomId: pending.sourceId, fromPush: '1' } })
    else {
      router.navigate('/challenges')
      if (target === 'expired') toast.info('Cette invitation a expiré')
    }
  }, [pending, navigation?.key, authenticated, me.data?.onboardingCompleted])
  return null
}
