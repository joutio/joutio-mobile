import { create } from 'zustand'
import { getUserId } from '@/lib/auth'
import type { SessionEndReason, SuspensionInfo } from '@/shared/types/session'

interface SessionState {
  /** Restauration terminée au démarrage. */
  ready: boolean
  authenticated: boolean
  /** Joueur de la session ouverte : passé aux hooks de `@joutio/client` qui en ont besoin ; un cache par joueur. */
  userId: string | null
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
  userId: null,
  endReason: null,
  suspension: null,
  setSession: (authenticated) => set({ authenticated, userId: authenticated ? getUserId() : null, endReason: null, suspension: null }),
  endSession: (endReason, suspension) => set({ authenticated: false, userId: null, endReason, suspension: suspension ?? null }),
  acknowledgeEnd: () => set({ endReason: null, suspension: null }),
  setReady: () => set({ ready: true }),
}))

/** Joueur de la session ouverte, `undefined` sans session (les hooks de la lib ne lisent alors rien). */
export const useSessionUserId = () => useSessionStore((state) => state.userId) ?? undefined
