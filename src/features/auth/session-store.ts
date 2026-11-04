import { create } from 'zustand'
import type { SessionEndReason } from '@/shared/types/session'

interface SessionState {
  /** Restauration terminée au démarrage. */
  ready: boolean
  authenticated: boolean
  endReason: SessionEndReason | null
  setSession: (authenticated: boolean) => void
  endSession: (reason: SessionEndReason) => void
  acknowledgeEnd: () => void
  setReady: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  ready: false,
  authenticated: false,
  endReason: null,
  setSession: (authenticated) => set({ authenticated, endReason: null }),
  endSession: (endReason) => set({ authenticated: false, endReason }),
  acknowledgeEnd: () => set({ endReason: null }),
  setReady: () => set({ ready: true }),
}))
