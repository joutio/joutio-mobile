import * as Haptics from 'expo-haptics'
import type { tokens } from './tokens.generated'

export type HapticName = keyof typeof tokens.haptic

/** Retours haptiques des tokens (`tokens.haptic.*.use` dit quand les utiliser). Jamais bloquant. */
export function haptic(name: HapticName) {
  const run = (): Promise<void> => {
    switch (name) {
      case 'selection':
        return Haptics.selectionAsync()
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      case 'heavy':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    }
  }
  run().catch(() => undefined)
}
