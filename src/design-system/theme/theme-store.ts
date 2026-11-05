import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'

export type ThemePreference = 'system' | 'dark' | 'light'

interface ThemeStore {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

/** Le stockage peut être indisponible : le thème retombe alors sur le système, sans erreur. */
export const safeStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return await AsyncStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: async (name, value) => {
    try {
      await AsyncStorage.setItem(name, value)
    } catch {
      // Réglage non persisté : il reste valable pour la session.
    }
  },
  removeItem: async (name) => {
    try {
      await AsyncStorage.removeItem(name)
    } catch {
      // Sans effet.
    }
  },
}

/** Réglage manuel du thème (Réglages › Apparence), par défaut celui du système. */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      preference: 'system',
      setPreference: (preference) => set({ preference }),
    }),
    { name: 'joutio.theme', storage: createJSONStorage(() => safeStorage) },
  ),
)
