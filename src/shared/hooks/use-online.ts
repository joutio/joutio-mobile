import { useEffect } from 'react'
import { AppState } from 'react-native'
import { create } from 'zustand'

type NetworkModule = typeof import('expo-network')

/**
 * `expo-network` est un module natif : un dev build antérieur à son ajout ne le contient pas. On le charge donc sans
 * planter ; sans lui, l'app se croit toujours en ligne (la détection s'active au prochain build natif).
 */
function loadNetwork(): NetworkModule | undefined {
  try {
    return require('expo-network') as NetworkModule
  } catch {
    return undefined
  }
}

const network = loadNetwork()

/** Réseau de l'appareil, tel que le système le rapporte. Lu par la bannière de connexion et par React Query (racine). */
export const useNetworkStore = create<{ online: boolean }>(() => ({ online: true }))

/** Hors ligne seulement si le système le dit : un `isInternetReachable` inconnu ne compte pas comme une coupure. */
const onlineOf = (state: { isConnected?: boolean; isInternetReachable?: boolean }) => state.isConnected !== false && state.isInternetReachable !== false

const setOnline = (online: boolean) => {
  if (useNetworkStore.getState().online !== online) useNetworkStore.setState({ online })
}

/**
 * Relit l'état du réseau. Renvoie l'état lu (vrai sans module natif). Sert au retour au premier plan — un changement
 * survenu pendant que l'app dormait n'est pas toujours émis — et au « Réessayer ».
 */
export async function refreshNetworkState(): Promise<boolean> {
  if (!network) return true
  try {
    const online = onlineOf(await network.getNetworkStateAsync())
    setOnline(online)
    return online
  } catch {
    return useNetworkStore.getState().online
  }
}

/** Suit le réseau de l'appareil dans `useNetworkStore`. À appeler une fois, dans le layout racine. */
export function useNetworkWatch() {
  useEffect(() => {
    if (!network) return
    let subscription: { remove: () => void } | undefined
    try {
      void refreshNetworkState()
      subscription = network.addNetworkStateListener((state) => setOnline(onlineOf(state)))
    } catch {
      // Module natif absent malgré l'import : on reste en ligne.
    }
    // Retour au premier plan : l'état gardé peut dater d'avant la mise en veille (fausse coupure après inactivité).
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshNetworkState()
    })
    return () => {
      subscription?.remove()
      appState.remove()
    }
  }, [])
}

/** Vrai tant que l'appareil a du réseau (`etats-systeme.md`, Hors connexion). */
export function useOnline(): boolean {
  return useNetworkStore((state) => state.online)
}
