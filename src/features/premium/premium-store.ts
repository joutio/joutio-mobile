import { create } from 'zustand'

import type { PremiumReason } from '@joutio/client-domain/premium'

/** `quota` : défis ; `topics`, `questions`, `team` : plafonds de création ; `frozen` : sujets gelés (`creation.md` § 3). */
export type PremiumContext = 'offer' | PremiumReason

interface PremiumState {
  open: boolean
  context: PremiumContext
  show: (context?: PremiumContext) => void
  hide: () => void
}

/** Feuille Premium unique (`premium.md`), ouverte depuis Réglages, Maîtrise, l'éditeur d'avatar ou un quota. */
export const usePremiumSheet = create<PremiumState>((set) => ({
  open: false,
  context: 'offer',
  show: (context = 'offer') => set({ open: true, context }),
  hide: () => set({ open: false }),
}))
