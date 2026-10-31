import { Checks } from "phosphor-react-native";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { useNativeTheme } from "@/ui/theme";
import { useMarkAllNotificationsRead } from "../hooks/useNotifications";

export function MarkAllReadButton() {
  const { colors } = useNativeTheme();
  const markAll = useMarkAllNotificationsRead();
  return (
    <JoIconButton
      label="Tout marquer comme lu"
      icon={<Checks size={24} color={colors.label} />}
      onPress={() => markAll.mutate()}
    />
  );
}
