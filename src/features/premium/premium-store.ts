import { create } from 'zustand'

/** `topics`, `questions`, `team` : plafonds de création (`creation.md` § 3). */
export type PremiumContext = 'offer' | 'quota' | 'topics' | 'questions' | 'team'

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
