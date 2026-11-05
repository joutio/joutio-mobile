import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { safeStorage } from './theme/theme-store'

/**
 * Réglages propres à l'appareil (`reglages.md` § 5) : sons, vibrations, détails des réponses, et les catégories de
 * notification que le BFF ne connaît pas encore (Revanches, Rangs et badges).
 */
interface DeviceSettings {
  sounds: boolean
  haptics: boolean
  /** Coche, croix et points à la révélation (`AnswerCard` `details`) : désactivé par défaut. */
  answerDetails: boolean
  notifyRematches: boolean
  notifyRanks: boolean
  /** Liste d'attente Premium rejointe (aucun endpoint BFF : mémorisé sur l'appareil). */
  premiumWaitlist: boolean
  set: (patch: Partial<Omit<DeviceSettings, 'set'>>) => void
}

export const useDeviceSettings = create<DeviceSettings>()(
  persist(
    (set) => ({
      sounds: true,
      haptics: true,
      answerDetails: false,
      notifyRematches: true,
      notifyRanks: false,
      premiumWaitlist: false,
      set: (patch) => set(patch),
    }),
    { name: 'joutio.device-settings', storage: createJSONStorage(() => safeStorage), partialize: ({ set: _set, ...state }) => state },
  ),
)
