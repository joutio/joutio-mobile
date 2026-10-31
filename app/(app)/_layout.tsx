import { Stack } from "expo-router";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { RealtimeRuntime } from "@/features/notifications/components/realtime-runtime";
import { InlineNavBar } from "@/shared/components/inline-nav-bar";
import { useNativeTheme } from "@/ui/theme";

/** Au-dessus des onglets : uniquement l'onboarding et le flux de duel, plein écran. */
export default function AppLayout() {
  const { colors } = useNativeTheme();

  return (
    <RequireAuth>
      <RealtimeRuntime />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="room/[roomId]"
          options={{
            headerShown: true,
            title: "Salon privé",
            presentation: "fullScreenModal",
            header: ({ back }) => (
              <InlineNavBar title="Salon privé" canGoBack={Boolean(back)} />
            ),
          }}
        />
        <Stack.Screen
          name="duel/[gameId]"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
        <Stack.Screen
          name="duel/search/[ticketId]"
          options={{ presentation: "fullScreenModal", gestureEnabled: false }}
        />
        <Stack.Screen
          name="duel/result/[gameId]"
          options={{ presentation: "fullScreenModal" }}
        />
      </Stack>
    </RequireAuth>
  );
}
