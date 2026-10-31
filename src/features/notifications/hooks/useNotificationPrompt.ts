import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import { useMe } from "@/features/auth/hooks/useMe";
import { getItem } from "@/lib/storage";
import { NOTIFICATION_PROMPT_KEY } from "../notification-permission-screen";

/** Une seule fois, au premier retour aux onglets après un duel. */
export function useNotificationPrompt() {
  const router = useRouter();
  const me = useMe();
  const played = me.data?.progression.ratedGames ?? 0;
  const asked = useRef(false);

  useEffect(() => {
    if (played === 0 || asked.current) return;
    asked.current = true;
    void getItem(NOTIFICATION_PROMPT_KEY).then((value) => {
      if (!value) router.push("/(app)/notification-permission");
    });
  }, [played, router]);
}
