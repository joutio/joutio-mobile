import { useEffect, useMemo, useState } from "react";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider } from "@tanstack/react-query";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from "@expo-google-fonts/geist";
import {
  GeistMono_400Regular,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
  GeistMono_700Bold,
} from "@expo-google-fonts/geist-mono";
import { SessionRuntime } from "@/features/auth/components/session-runtime";
import { JoDialogHost } from "@/ui/jo/jo-dialog-host";
import { ToastHost } from "@/shared/components/toast-host";
import { createQueryClient } from "@/lib/query-client";
import { useNativeTheme } from "@/ui/theme";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

// Les requêtes attendent le réseau et repartent seules à son retour.
onlineManager.setEventListener((setOnline) => {
  const subscription = Network.addNetworkStateListener((state) => {
    setOnline(state.isConnected !== false);
  });
  return () => subscription.remove();
});

export default function RootLayout() {
  const { dark, colors } = useNativeTheme();
  const navigationTheme = useMemo(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.background,
        border: colors.border,
        text: colors.label,
        primary: colors.accent,
      },
    };
  }, [colors, dark]);
  const [queryClient] = useState(() => createQueryClient());
  const [fontsLoaded] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
    GeistMono_400Regular,
    GeistMono_500Medium,
    GeistMono_600SemiBold,
    GeistMono_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  // Fond de fenêtre : c'est lui qui apparaît derrière les transitions natives.
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).catch(() => undefined);
  }, [colors.background]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Sans ces props, le provider ajoute des marges blanches autour de l'app sur Android. */}
        <KeyboardProvider
          statusBarTranslucent
          navigationBarTranslucent
          preserveEdgeToEdge
        >
          <ThemeProvider value={navigationTheme}>
          <QueryClientProvider client={queryClient}>
              <SessionRuntime />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.background },
                }}
              />
              <ToastHost />
              <JoDialogHost />
              <StatusBar style={dark ? "light" : "dark"} />
            </QueryClientProvider>
        </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
