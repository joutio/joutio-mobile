import { ActiveGameBanner, ActiveGamesWatch, useBannerGame } from '@/features/play/components/active-game-banner'
import { IncomingRematch } from '@/features/play/components/incoming-rematch'
import { Stack } from 'expo-router'
import { useRef } from 'react'
import { View } from 'react-native'
import { nativeHeaderOptions, TopBannerProvider, useTheme } from '@/design-system'
import { NotificationsRuntime } from '@/features/notifications/components/notifications-runtime'
import { PremiumHost } from '@/features/premium/premium-host'
import { ConnectionBanner } from '@/shared/components/connection-banner'
import { useConnectionBanner } from '@/shared/hooks/use-connection-banner'

export const unstable_settings = { anchor: '(tabs)' }

/** Écrans du joueur connecté : les 5 onglets, puis les écrans poussés par-dessus. */
export default function AppLayout() {
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
      {/* La bande est choisie ici et portée par chaque écran, en tête de sa mise en page (`TopBannerFrame`). */}
      <TopBannerProvider
        kind={kind}
        render={(shown, safeTop) =>
          shown === 'connection' ? (
            <ConnectionBanner state={lastConnection.current} onRetry={() => void connection.retry()} safeTop={safeTop} />
          ) : (
            <ActiveGameBanner safeTop={safeTop} />
          )
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
      </TopBannerProvider>
      {/* Toasts des notifications reçues ; le cache suit `useJoutioSync`, monté à la racine. */}
      <NotificationsRuntime />
      {/* Parties en cours : leur fin retire la bande « Partie en cours ». */}
      <ActiveGamesWatch />
      {/* Revanche reçue, au-dessus de tout écran (sauf pendant un duel). */}
      <IncomingRematch />
      {/* Feuille Premium, ouverte depuis Réglages, Maîtrise ou l'éditeur d'avatar. */}
      <PremiumHost />
    </View>
  )
}
