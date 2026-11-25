import { onlineManager } from '@tanstack/react-query'
import { createJoutioQueryClient, JoutioClientProvider } from '@joutio/client/core'
import { useMe } from '@joutio/client/me'
import { useJoutioSync } from '@joutio/client/sync'
import { DarkTheme, DefaultTheme, Stack, ThemeProvider as NavigationThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Notice, Button, DialogHost, ThemeProvider, ToastHost, tokens, useJoutioFonts, useTheme } from '@/design-system'
import { LaunchScreen, SessionRuntime, useLogout, useSessionStore, useSessionUserId } from '@/features/auth'
import { useLanguageSync } from '@/features/me'
import { ExpoPushRuntime } from '@/features/notifications/components/expo-push-runtime'
import { useCatalogAccess } from '@/features/auth/hooks/use-catalog-access'
import { BirthDateScreen } from '@/features/onboarding/components/birth-date-screen'
import { TermsScreen } from '@/features/onboarding/components/terms-screen'
import { api } from '@/lib/api'
import { realtime } from '@/lib/ws'
import { useNetworkStore, useNetworkWatch } from '@/shared/hooks/use-online'
import { useT } from '@/lib/i18n'

SplashScreen.preventAutoHideAsync().catch(() => undefined)
// Le splash natif s'efface sur `LaunchScreen` (même logo, même fond) au lieu de couper net.
SplashScreen.setOptions({ fade: true, duration: 250 })

/**
 * Durée minimale du lancement (`onboarding.md`, étape Lancement) : un splash qui disparaît en une frame
 * passe pour un bug. Comptée depuis le chargement du module, splash natif et `LaunchScreen` compris.
 */
const LAUNCH_MIN_MS = 1200
const launchStartedAt = Date.now()

/** Vrai une fois `LAUNCH_MIN_MS` écoulées depuis le démarrage de l'app. */
function useLaunchMinElapsed(): boolean {
  const [elapsed, setElapsed] = useState(() => Date.now() - launchStartedAt >= LAUNCH_MIN_MS)
  useEffect(() => {
    if (elapsed) return
    const timer = setTimeout(() => setElapsed(true), Math.max(0, LAUNCH_MIN_MS - (Date.now() - launchStartedAt)))
    return () => clearTimeout(timer)
  }, [elapsed])
  return elapsed
}

/** `GET /api/me` a échoué au démarrage : réessayer, ou se déconnecter. */
function BootError({ onRetry }: { onRetry: () => void }) {
  const t = useT()
  const { colors } = useTheme()
  const logout = useLogout()
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: tokens.space[4], padding: tokens.space[5], backgroundColor: colors.bg }}>
      <Notice title={t('boot.title')} message={t('common.checkConnection')} />
      <Button full onPress={onRetry}>
        {t('callback.retry')}
      </Button>
      <Button full variant="plain" tone="neutral" loading={logout.isPending} onPress={() => logout.mutate()}>
        {t('onboarding.ended.logout')}
      </Button>
    </View>
  )
}

function Navigation() {
  const ready = useSessionStore((state) => state.ready)
  const authenticated = useSessionStore((state) => state.authenticated)
  const launchMinElapsed = useLaunchMinElapsed()

  if (!launchMinElapsed || !ready) return <LaunchScreen />
  return authenticated ? <SignedInNavigation /> : <Routes authenticated={false} onboarded={false} />
}

/** Session ouverte : le compte (`GET /api/me`) décide des étapes obligatoires et de l'onboarding. */
function SignedInNavigation() {
  const me = useMe()
  useLanguageSync(me.data?.language)

  if (me.isPending) return <LaunchScreen />
  if (me.isError && !me.data) return <BootError onRetry={() => void me.refetch()} />

  // Compte récent sans date de naissance : demandée une fois avant tout le reste (`onboarding.md`).
  if (me.data.birthDateRequired) return <BirthDateScreen />
  // CGU en vigueur pas encore acceptées (première connexion ou nouvelle version) : présentées avant de jouer.
  if (me.data.termsUpToDate === false) return <TermsScreen />

  return <Routes authenticated onboarded={me.data.onboardingCompleted} />
}

function Routes({ authenticated, onboarded }: { authenticated: boolean; onboarded: boolean }) {
  const { colors } = useTheme()
  const catalogAccess = useCatalogAccess()
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={authenticated && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={authenticated && !onboarded}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={!authenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      {/* Lien de salon partagé : ouvert avec ou sans session. */}
      <Stack.Screen name="join/[roomId]" />
      {/* Liens universels go.joutio.com (partage.md § 2), avec ou sans session. */}
      <Stack.Screen name="p/[id]" />
      <Stack.Screen name="t/[id]" />
      <Stack.Screen name="j/[id]" />
      <Stack.Screen name="i/[id]" />
      <Stack.Protected guard={authenticated && onboarded && catalogAccess}>
        <Stack.Screen name="(dev)" />
      </Stack.Protected>
    </Stack>
  )
}

/** Synchronisation du cache sur les flux personnels du joueur connecté, montée une fois. */
function SessionSync() {
  useJoutioSync(useSessionUserId())
  return null
}

// Hors connexion, les lectures attendent le réseau au lieu d'échouer, puis partent à son retour.
onlineManager.setEventListener((setOnline) => useNetworkStore.subscribe((state) => setOnline(state.online)))

/**
 * Racine de `@joutio/client` : client HTTP, transport STOMP, horloge et un cache **par session** — un autre compte ne
 * voit jamais les données du précédent, sans que l'app touche au cache.
 */
function JoutioRoot({ children }: { children: ReactNode }) {
  const userId = useSessionStore((state) => state.userId)
  const [cache, setCache] = useState(() => ({ userId, client: createJoutioQueryClient() }))
  if (cache.userId !== userId) setCache({ userId, client: createJoutioQueryClient() })
  return (
    <JoutioClientProvider http={api} realtime={realtime} clock={Date.now} queryClient={cache.client}>
      {children}
    </JoutioClientProvider>
  )
}

function Root() {
  const { colors, scheme } = useTheme()
  useNetworkWatch()

  // Fond natif derrière les transitions : sans lui, la navigation montre un fond clair.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined)
  }, [colors.bg])

  // Thème react-navigation : ses fonds par défaut (scènes d'onglets, cartes) sont clairs et apparaissent pendant
  // les transitions natives. Ils reprennent ici le fond de l'app.
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme
    return {
      ...base,
      colors: { ...base.colors, background: colors.bg, card: colors.bg, border: colors.border, text: colors.text, primary: colors.accent },
    }
  }, [scheme, colors])

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SessionRuntime />
      <SessionSync />
      <Navigation />
      <ExpoPushRuntime />
      <ToastHost />
      <DialogHost />
    </NavigationThemeProvider>
  )
}

export default function RootLayout() {
  const fontsReady = useJoutioFonts()

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined)
  }, [fontsReady])

  if (!fontsReady) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
          <JoutioRoot>
            <ThemeProvider>
              <Root />
            </ThemeProvider>
          </JoutioRoot>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
