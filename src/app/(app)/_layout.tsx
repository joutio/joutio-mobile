import { useMe } from '@/features/me'
import { PlaySessionProvider } from '@/features/play/hooks/play-session'
import { ActiveGameBanner, useBannerGame } from '@/features/play/components/active-game-banner'
import { Stack } from 'expo-router'
import { useRef } from 'react'
import { View } from 'react-native'
import { TopBannerHost } from '@/shared/components/top-banner-host'
import { nativeHeaderOptions, useTheme } from '@/design-system'
import { NotificationsRuntime } from '@/features/notifications/components/notifications-runtime'
import { RealtimeInvalidation } from '@/features/realtime/realtime-invalidation'
import { RematchHost } from '@/features/play/components/rematch-host'
import { PremiumHost } from '@/features/premium/premium-host'
import { ConnectionBanner } from '@/shared/components/connection-banner'
import { useConnectionBanner } from '@/shared/hooks/use-connection-banner'

export const unstable_settings = { anchor: '(tabs)' }


/** Écrans du joueur connecté : les 5 onglets, puis les écrans poussés par-dessus. */
export default function AppLayout() {
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  return (
    <PlaySessionProvider key={userId} userId={userId}>
      <AppNavigation />
    </PlaySessionProvider>
  )
}

function AppNavigation() {
  const theme = useTheme()
  const connection = useConnectionBanner()
  const bannerGame = useBannerGame()
  // La coupure réseau se signale partout, parcours de jeu compris (plus de `ReconnectCountdown`, 2026-11-14). Une seule
  // bande à la fois : la connexion l'emporte sur la partie en cours.
  const kind = connection.state !== 'hidden' ? 'connection' : bannerGame ? 'game' : null
  // Dernier état de connexion affiché : la bande le garde pendant sa sortie.
  const lastConnection = useRef(connection.state)
  if (connection.state !== 'hidden') lastConnection.current = connection.state
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* La bande se pose par-dessus l'écran et le pousse d'une cale animée (`TopBannerHost`) : seule la barre du
          haut descend, le contenu ne remonte jamais. */}
      <TopBannerHost
        kind={kind}
        render={(shown) =>
          shown === 'connection' ? <ConnectionBanner state={lastConnection.current} onRetry={() => void connection.retry()} /> : <ActiveGameBanner />
        }
      >
          <Stack screenOptions={nativeHeaderOptions(theme)}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            {/* Tâches ciblées (`navigation.md`) : atelier d'un sujet et suppression de compte, sans barre d'onglets. */}
            <Stack.Screen name="workshop" options={{ headerShown: false }} />
            <Stack.Screen name="delete-account" options={{ headerShown: false }} />
            {/* Salon : page classique avec retour. Matchmaking et duel gardent leur présentation immersive. */}
            <Stack.Screen name="room/[roomId]" options={{ headerShown: false, presentation: 'card' }} />
            <Stack.Screen name="matchmaking/[ticketId]" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            <Stack.Screen name="duel/[gameId]" options={{ headerShown: false, animation: 'fade', gestureEnabled: false }} />
            {/* Résultat d'une partie passée, ouvert depuis l'historique : le retour ramène à la liste. */}
            <Stack.Screen name="result/[gameId]/index" options={{ headerShown: false, animation: 'fade' }} />
            {/* Chat d'après-duel : écran poussé, le retour retrouve le résultat. */}
            <Stack.Screen name="result/[gameId]/chat" options={{ headerShown: false, animation: 'slide_from_right' }} />
            {/* Éditeur d'avatar : modale plein écran, sans barre d'onglets (Annuler / Enregistrer). */}
            <Stack.Screen name="avatar" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            {/* Éditer le profil (editer-profil.md) : tâche ciblée, Annuler / Enregistrer, sans barre d'onglets. */}
            <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            {/* Éditeur de question (Mes sujets) : modale plein écran, Annuler / Enregistrer. */}
            <Stack.Screen name="question-editor" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          </Stack>
      </TopBannerHost>
      {/* Demandes de revanche reçues, au-dessus de tout écran (sauf pendant un duel). */}
      {/* Événements poussés par le serveur : chaque type relit les vues qu'il touche (table unique). */}
      <RealtimeInvalidation />
      <NotificationsRuntime />
      <RematchHost />
      {/* Feuille Premium, ouverte depuis Réglages, Maîtrise ou l'éditeur d'avatar. */}
      <PremiumHost />
    </View>
  )
}
