import { create } from 'zustand'
import type { SessionEndReason, SuspensionInfo } from '@/shared/types/session'

interface SessionState {
  /** Restauration terminée au démarrage. */
  ready: boolean
  authenticated: boolean
  endReason: SessionEndReason | null
  /** Suspension : fin et motif annoncés par le serveur. */
  suspension: SuspensionInfo | null
  setSession: (authenticated: boolean) => void
  endSession: (reason: SessionEndReason, suspension?: SuspensionInfo) => void
  acknowledgeEnd: () => void
  setReady: () => void
}

export const useSessionStore = create<SessionState>((set) => ({
  ready: false,
  authenticated: false,
  endReason: null,
  suspension: null,
  setSession: (authenticated) => set({ authenticated, endReason: null, suspension: null }),
  endSession: (endReason, suspension) => set({ authenticated: false, endReason, suspension: suspension ?? null }),
  acknowledgeEnd: () => set({ endReason: null, suspension: null }),
  setReady: () => set({ ready: true }),
}))
