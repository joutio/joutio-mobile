import { create } from 'zustand'

/**
 * **Mock** (`fiche-joueur.md` § 5) : le BFF n'a pas d'endpoint pour bloquer un joueur. Blocage tenu en mémoire, par
 * joueur, le temps de la session : le parcours (Dialog, pastille « Bloqué », Débloquer) est prêt à être branché.
 */
interface BlockMocksState {
  blocked: Record<string, true>
  setBlocked: (userId: string, blocked: boolean) => void
}

export const useBlockMocks = create<BlockMocksState>((set) => ({
  blocked: {},
  setBlocked: (userId, blocked) =>
    set((state) => {
      const next = { ...state.blocked }
      if (blocked) next[userId] = true
      else delete next[userId]
      return { blocked: next }
    }),
}))

/** Le joueur est-il bloqué (mock) ? */
export const useIsBlocked = (userId: string) => useBlockMocks((state) => Boolean(state.blocked[userId]))
