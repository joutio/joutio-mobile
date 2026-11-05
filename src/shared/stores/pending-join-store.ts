import { create } from 'zustand'

/**
 * Salon ouvert par un lien sans session : repris après la connexion (`app/index.tsx`), pour revenir sur « Rejoindre
 * un salon » plutôt que sur l'accueil.
 */
interface PendingJoinState {
  roomId: string | null
  set: (roomId: string | null) => void
}

export const usePendingJoin = create<PendingJoinState>((set) => ({ roomId: null, set: (roomId) => set({ roomId }) }))
