import { useEffect, useState } from 'react'
import { AppState, Linking } from 'react-native'
import { BellIcon, ListRow, toast } from '@/design-system'
import { refreshPushPermission, requestPushPermission, usePushState } from '../lib/expo-push'
import { useT } from '@/lib/i18n'

export function PushPermissionRow() {
  const t = useT()
  const permission = usePushState((state) => state.permission)
  const failed = usePushState((state) => state.error)
  useEffect(() => {
    const refresh = () => {
      void refreshPushPermission().catch(() => undefined)
    }
    refresh()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh()
    })
    return () => subscription.remove()
  }, [])
  // Permission du système (aucune donnée serveur) : un simple état d'attente.
  const [pending, setPending] = useState(false)
  const activate = async () => {
    setPending(true)
    try {
      await (permission === 'denied' || (permission === 'granted' && !failed) ? Linking.openSettings() : requestPushPermission())
    } catch {
      toast.warning(t('mobile.notifications.push.failed'))
    } finally {
      setPending(false)
    }
  }
  const label = failed
    ? t('mobile.notifications.push.retry')
    : permission === 'granted'
      ? t('mobile.notifications.push.allowed')
      : permission === 'denied'
        ? t('mobile.notifications.push.denied')
        : t('mobile.notifications.push.toEnable')
  return (
    <ListRow icon={BellIcon} label={t('mobile.notifications.push.system')} value={label} control="chevron" disabled={pending} onPress={() => void activate()} />
  )
}
