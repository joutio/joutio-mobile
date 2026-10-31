import { Redirect, Stack } from "expo-router";
import { BootScreen } from "@/features/auth/components/boot-screen";
import { useSessionStore } from "@/features/auth/session-store";
import { useNativeTheme } from "@/ui/theme";
import { HOME_HREF } from "@/lib/navigation";

export default function AuthLayout() {
  const theme = useNativeTheme();
  const ready = useSessionStore((state) => state.ready);
  const authenticated = useSessionStore((state) => state.authenticated);
  const pendingRoomId = useSessionStore((state) => state.pendingRoomId);

  if (!ready) return <BootScreen />;
  if (authenticated) {
    return (
      <Redirect
        href={
          pendingRoomId
            ? `/(app)/room/${pendingRoomId}`
            : HOME_HREF
        }
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
