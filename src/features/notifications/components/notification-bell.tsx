import { useRouter } from "expo-router";
import { Bell } from "phosphor-react-native";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { useNativeTheme } from "@/ui/theme";
import { useUnreadCount } from "../hooks/useNotifications";

/** Cloche de la barre de titre : pastille tant qu'il reste des non lues. */
export function NotificationBell() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const unread = useUnreadCount();
  const count = unread.data ?? 0;

  return (
    <JoIconButton
      label={count > 0 ? `Notifications, ${count} non lues` : "Notifications"}
      icon={<Bell size={24} color={colors.label} />}
      dot={count > 0}
      onPress={() => router.push("/notifications")}
    />
  );
}
