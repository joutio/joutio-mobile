import { focusManager, QueryClient } from '@tanstack/react-query'
import { AppState, Platform } from 'react-native'

/**
 * Premier plan = « focus » pour React Query (2026-11-07) : au retour dans l'app, seules les requêtes **périmées**
 * (`staleTime` dépassé) affichées à l'écran se rechargent ; le reste du cache est servi tel quel.
 */
focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (state) => {
    if (Platform.OS !== 'web') setFocused(state === 'active')
  })
  return () => subscription.remove()
})

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 5 * 60 * 1000, refetchOnWindowFocus: true, retry: 1 },
      mutations: { retry: 0 },
    },
  })
}
