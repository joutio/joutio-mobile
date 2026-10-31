import { useRouter } from "expo-router";
import { Plus } from "@/ui/phosphor";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { JoNavBar } from "@/ui/jo/jo-nav-bar";
import { useNativeTheme } from "@/ui/theme";
import { usePendingChallenges } from "../hooks/useChallenges";
import { TOPICS_HREF } from "@/lib/navigation";

/** Barre de l'onglet Défis : compteur d'ouverts et lancement depuis le catalogue. */
export function ChallengesNavBar() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const { total } = usePendingChallenges();

  return (
    <JoNavBar
      title="Défis"
      subtitle={`${total} ${total > 1 ? "défis ouverts" : "défi ouvert"}`}
      actions={
        <>
          <JoIconButton
            label="Choisir un sujet"
            icon={<Plus size={24} color={colors.label} />}
            onPress={() => router.navigate(TOPICS_HREF)}
          />
          <NotificationBell />
        </>
      }
    />
  );
}
