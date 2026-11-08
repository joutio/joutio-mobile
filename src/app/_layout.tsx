import { QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import * as SystemUI from 'expo-system-ui'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Banner, Button, DialogHost, ThemeProvider, ToastHost, tokens, useJoutioFonts, useTheme } from '@/design-system'
import { LaunchScreen, SessionRuntime, useLogout, useSessionStore } from '@/features/auth'
import { useMe } from '@/features/me'
import { ExpoPushRuntime } from '@/features/notifications/components/expo-push-runtime'
import { useCatalogAccess } from '@/features/auth/hooks/use-catalog-access'
import { createQueryClient } from '@/lib/query-client'
import { useNetworkBridge } from '@/shared/hooks/use-online'

SplashScreen.preventAutoHideAsync().catch(() => undefined)
// Le splash natif s'efface sur `LaunchScreen` (même logo, même fond) au lieu de couper net.
SplashScreen.setOptions({ fade: true, duration: 250 })

/** `GET /api/me` a échoué au démarrage : réessayer, ou se déconnecter. */
function BootError({ onRetry }: { onRetry: () => void }) {
  const { colors } = useTheme()
  const logout = useLogout()
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: tokens.space[4], padding: tokens.space[5], backgroundColor: colors.bg }}>
      <Banner title="Joutio ne répond pas" message="Vérifie ta connexion et réessaie." />
      <Button full onPress={onRetry}>
        Réessayer
      </Button>
      <Button full variant="plain" tone="neutral" loading={logout.isPending} onPress={() => logout.mutate()}>
        Se déconnecter
      </Button>
    </View>
  )
}

function Navigation() {
  const { colors } = useTheme()
  const ready = useSessionStore((state) => state.ready)
  const authenticated = useSessionStore((state) => state.authenticated)
  const me = useMe(ready && authenticated)
  const catalogAccess = useCatalogAccess()

  if (!ready || (authenticated && me.isPending)) return <LaunchScreen />
  if (authenticated && me.isError && !me.data) return <BootError onRetry={() => void me.refetch()} />

  const onboarded = me.data?.onboardingCompleted ?? false
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
      <Stack.Protected guard={authenticated && onboarded && catalogAccess}>
        <Stack.Screen name="(dev)" />
      </Stack.Protected>
    </Stack>
  )
}

function Root() {
  const { colors, scheme } = useTheme()
  useNetworkBridge()

  // Fond natif derrière les transitions : sans lui, la navigation montre un fond clair.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.bg).catch(() => undefined)
  }, [colors.bg])

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SessionRuntime />
      <Navigation />
      <ExpoPushRuntime />
      <ToastHost />
      <DialogHost />
    </>
  )
}

export default function RootLayout() {
  const fontsReady = useJoutioFonts()
  const [queryClient] = useState(createQueryClient)

  useEffect(() => {
    if (fontsReady) SplashScreen.hideAsync().catch(() => undefined)
  }, [fontsReady])

  if (!fontsReady) return null
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent preserveEdgeToEdge>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <Root />
            </ThemeProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
