import { create } from 'zustand'
import type { CategoryCode } from '@/design-system'

/** Brouillon du parcours d'entrée, en mémoire : e-mail saisi, univers choisis, saut du premier thème. */
interface OnboardingState {
  email: string
  universes: CategoryCode[]
  /** « Passer » sur Univers : pas de premier thème. */
  skipped: boolean
  setEmail: (email: string) => void
  setUniverses: (universes: CategoryCode[]) => void
  setSkipped: (skipped: boolean) => void
  reset: () => void
}

export const MAX_UNIVERSES = 3

export const useOnboardingStore = create<OnboardingState>((set) => ({
  email: '',
  universes: [],
  skipped: false,
  setEmail: (email) => set({ email }),
  setUniverses: (universes) => set({ universes: universes.slice(0, MAX_UNIVERSES) }),
  setSkipped: (skipped) => set({ skipped }),
  reset: () => set({ universes: [], skipped: false }),
}))
