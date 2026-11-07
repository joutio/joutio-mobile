import { Stack, useSegments } from 'expo-router'
import { View } from 'react-native'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import { nativeHeaderOptions, useTheme } from '@/design-system'
import { RematchHost } from '@/features/play/components/rematch-host'
import { PremiumHost } from '@/features/premium/premium-host'
import { ConnectionBanner } from '@/shared/components/connection-banner'
import { useConnectionBanner } from '@/shared/hooks/use-connection-banner'

export const unstable_settings = { anchor: '(tabs)' }

/** Parcours de jeu : la coupure y est déjà signalée en plein écran (`ReconnectCountdown`), pas de bannière en plus. */
const GAME_ROUTES = new Set(['room', 'matchmaking', 'duel'])

/** Écrans du joueur connecté : les 5 onglets, puis les écrans poussés par-dessus. */
export default function AppLayout() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const segments = useSegments() as string[]
  const connection = useConnectionBanner()
  const banner = connection.state !== 'hidden' && !GAME_ROUTES.has(segments[1] ?? '')
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {banner && <ConnectionBanner state={connection.state} onRetry={() => void connection.retry()} />}
      {/* La bannière prend la safe area haute : les barres des écrans dessous ne la réservent plus. */}
      <SafeAreaInsetsContext.Provider value={banner ? { ...insets, top: 0 } : insets}>
        <Stack screenOptions={nativeHeaderOptions(theme)}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Parcours de jeu : plein écran, sans en-tête ; le retour d'un duel passe par la confirmation d'abandon. */}
          <Stack.Screen name="room/[roomId]" options={{ headerShown: false }} />
          <Stack.Screen name="matchmaking/[ticketId]" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="duel/[gameId]" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
          {/* Résultat d'une partie passée, ouvert depuis l'historique : le retour ramène à la liste. */}
          <Stack.Screen name="result/[gameId]/index" options={{ headerShown: false, animation: 'fade' }} />
          {/* Chat d'après-duel : écran poussé, le retour retrouve le résultat. */}
          <Stack.Screen name="result/[gameId]/chat" options={{ headerShown: false, animation: 'slide_from_right' }} />
          {/* Éditeur d'avatar : modale plein écran, sans barre d'onglets (Annuler / Enregistrer). */}
          <Stack.Screen name="avatar" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          {/* Éditeur de question (Mes sujets) : modale plein écran, Annuler / Enregistrer. */}
          <Stack.Screen name="question-editor" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        </Stack>
      </SafeAreaInsetsContext.Provider>
      {/* Demandes de revanche reçues, au-dessus de tout écran (sauf pendant un duel). */}
      <RematchHost />
      {/* Feuille Premium, ouverte depuis Réglages, Récompenses, Maîtrise ou l'éditeur d'avatar. */}
      <PremiumHost />
    </View>
  )
}
