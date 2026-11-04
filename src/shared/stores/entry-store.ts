import { create } from 'zustand'

/**
 * Le joueur a quitté le catalogue pour le vrai parcours. Tant qu'il ne l'a pas fait, l'entrée de l'app ouvre le
 * catalogue ; ensuite, les bascules de session (connexion, fin d'onboarding) suivent le parcours normal.
 */
interface EntryState {
  entered: boolean
  enter: () => void
}

export const useEntryStore = create<EntryState>((set) => ({ entered: false, enter: () => set({ entered: true }) }))
