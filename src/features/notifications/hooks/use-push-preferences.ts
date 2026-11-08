import { useMutation } from '@tanstack/react-query'
import { toast, useDeviceSettings } from '@/design-system'
import { syncExpoPush } from '../lib/expo-push'

export function usePushRematches() {
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
    onError: () => toast.warning('Le réglage des revanches n’a pas pu être enregistré'),
  })
}
