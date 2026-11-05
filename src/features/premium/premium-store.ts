import { create } from 'zustand'

export type PremiumContext = 'offer' | 'quota'

interface PremiumState {
  open: boolean
  context: PremiumContext
  show: (context?: PremiumContext) => void
  hide: () => void
}

/** Feuille Premium unique (`premium.md`), ouverte depuis Réglages, Récompenses, Maîtrise, l'éditeur d'avatar ou un quota. */
export const usePremiumSheet = create<PremiumState>((set) => ({
  open: false,
  context: 'offer',
  show: (context = 'offer') => set({ open: true, context }),
  hide: () => set({ open: false }),
}))
