import { Stack } from 'expo-router'
import { nativeHeaderOptions, useTheme } from '@/design-system'
import { RematchHost } from '@/features/play/components/rematch-host'

export const unstable_settings = { anchor: '(tabs)' }

/** Écrans du joueur connecté : les 5 onglets, puis les écrans poussés par-dessus. */
export default function AppLayout() {
  const theme = useTheme()
  return (
    <>
      <Stack screenOptions={nativeHeaderOptions(theme)}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        {/* Parcours de jeu : plein écran, sans en-tête ; le retour d'un duel passe par la confirmation d'abandon. */}
        <Stack.Screen name="room/[roomId]" options={{ headerShown: false }} />
        <Stack.Screen name="matchmaking/[ticketId]" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="duel/[gameId]" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
        {/* Résultat d'une partie passée, ouvert depuis l'historique : le retour ramène à la liste. */}
        <Stack.Screen name="result/[gameId]" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
      {/* Demandes de revanche reçues, au-dessus de tout écran (sauf pendant un duel). */}
      <RematchHost />
    </>
  )
}
