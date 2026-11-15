import { useEffect } from 'react'
import { AppState, Linking } from 'react-native'
import { useMutation } from '@tanstack/react-query'
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
  const activate = useMutation({
    mutationFn: () => (permission === 'denied' || (permission === 'granted' && !failed) ? Linking.openSettings() : requestPushPermission()),
    onError: () => toast.warning(t('mobile.notifications.push.failed')),
  })
  const label = failed ? t('mobile.notifications.push.retry') : permission === 'granted' ? t('mobile.notifications.push.allowed') : permission === 'denied' ? t('mobile.notifications.push.denied') : t('mobile.notifications.push.toEnable')
  return (
    <ListRow icon={BellIcon} label={t('mobile.notifications.push.system')} value={label} control="chevron" disabled={activate.isPending} onPress={() => activate.mutate()} />
  )
}
