import { onlineManager } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore } from 'react'

type NetworkModule = typeof import('expo-network')

/**
 * `expo-network` est un module natif : un dev build antérieur à son ajout ne le contient pas. On le charge donc sans
 * planter ; sans lui, l'app se croit toujours en ligne (la détection s'active au prochain build natif).
 */
function loadNetwork(): NetworkModule | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-network') as NetworkModule
  } catch {
    return undefined
  }
}

const network = loadNetwork()

/** Hors ligne seulement si le système le dit : un `isInternetReachable` inconnu ne compte pas comme une coupure. */
const onlineOf = (state: { isConnected?: boolean; isInternetReachable?: boolean }) => state.isConnected !== false && state.isInternetReachable !== false

/**
 * Relie React Query au réseau (`onlineManager`) : hors connexion, les requêtes se mettent en pause au lieu d'échouer,
 * puis reprennent seules au retour du réseau. À appeler une fois, dans le layout racine.
 */
export function useNetworkBridge() {
  useEffect(() => {
    if (!network) return
    return onlineManager.setEventListener((setOnline) => {
      let subscription: { remove: () => void } | undefined
      try {
        network.getNetworkStateAsync().then(
          (state) => setOnline(onlineOf(state)),
          () => undefined,
        )
        subscription = network.addNetworkStateListener((state) => setOnline(onlineOf(state)))
      } catch {
        // Module natif absent malgré l'import : on reste en ligne.
      }
      return () => subscription?.remove()
    })
  }, [])
}

/** Vrai tant que l'appareil a du réseau (`etats-systeme.md`, Hors connexion). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
  )
}
