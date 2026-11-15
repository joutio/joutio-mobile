import { useMutation } from '@tanstack/react-query'
import { toast, useDeviceSettings } from '@/design-system'
import { syncExpoPush } from '../lib/expo-push'
import { useT } from '@/lib/i18n'

export function usePushRematches() {
  const t = useT()
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const previous = useDeviceSettings.getState().notifyRematches
      useDeviceSettings.getState().set({ notifyRematches: enabled })
      try {
        await syncExpoPush()
      } catch (error) {
        useDeviceSettings.getState().set({ notifyRematches: previous })
        throw error
      }
    },
    onError: () => toast.warning(t('mobile.notifications.rematchPrefFailed')),
  })
}
