import { useMe } from '@/features/me'
import { PlaySessionProvider } from '@/features/play/hooks/play-session'
import { ActiveGameBanner, useBannerGame } from '@/features/play/components/active-game-banner'
import { Stack } from 'expo-router'
import { useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import Animated from 'react-native-reanimated'
import { BANNER_MS, bannerLayout } from '@/shared/components/banner-motion'
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context'
import { nativeHeaderOptions, useTheme } from '@/design-system'
import { NotificationsRuntime } from '@/features/notifications/components/notifications-runtime'
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
  const insets = useSafeAreaInsets()
  const connection = useConnectionBanner()
  const bannerGame = useBannerGame()
  // La coupure réseau se signale partout, parcours de jeu compris (plus de `ReconnectCountdown`, 2026-11-14).
  const banner = connection.state !== 'hidden'
  const shown = banner || !!bannerGame
  // Sortie de la bande : la safe area reste prise et une cale de sa hauteur tient sa place le temps que l'écran
  // remonte, puis on la rend d'un coup (sans mouvement visible). Dérivé au rendu pour ne pas peindre d'état
  // intermédiaire.
  const [lastShown, setLastShown] = useState(shown)
  const [settling, setSettling] = useState(false)
  if (lastShown !== shown) {
    setLastShown(shown)
    setSettling(!shown)
  }
  useEffect(() => {
    if (!settling) return
    const timer = setTimeout(() => setSettling(false), BANNER_MS)
    return () => clearTimeout(timer)
  }, [settling])
  const layout = useMemo(() => bannerLayout(insets.top), [insets.top])
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {banner && <ConnectionBanner state={connection.state} onRetry={() => void connection.retry()} />}
      <ActiveGameBanner hidden={banner} />
      {settling && !shown && <View style={{ height: insets.top }} />}
      {/* La bannière prend la safe area haute : les barres des écrans dessous ne la réservent plus. */}
      {/* L'écran suit la bande qui entre ou sort, au lieu de sauter de sa hauteur. */}
      <Animated.View layout={layout} style={{ flex: 1 }}>
        <SafeAreaInsetsContext.Provider value={shown || settling ? { ...insets, top: 0 } : insets}>
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
        </SafeAreaInsetsContext.Provider>
      </Animated.View>
      {/* Demandes de revanche reçues, au-dessus de tout écran (sauf pendant un duel). */}
      <NotificationsRuntime />
      <RematchHost />
      {/* Feuille Premium, ouverte depuis Réglages, Maîtrise ou l'éditeur d'avatar. */}
      <PremiumHost />
    </View>
  )
}
