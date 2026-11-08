import { useEffect } from 'react'
import { AppState, Linking } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import { BellIcon, ListRow, toast } from '@/design-system'
import { refreshPushPermission, requestPushPermission, usePushState } from '../lib/expo-push'

export function PushPermissionRow() {
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
    onError: () => toast.warning('L’activation a échoué. Réessaie dans un instant.'),
  })
  const label = failed ? 'Activation à réessayer' : permission === 'granted' ? 'Autorisées' : permission === 'denied' ? 'Désactivées' : 'À activer'
  return (
    <ListRow icon={BellIcon} label="Notifications système" value={label} control="chevron" disabled={activate.isPending} onPress={() => activate.mutate()} />
  )
}
