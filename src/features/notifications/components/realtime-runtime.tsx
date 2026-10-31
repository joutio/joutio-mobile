import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { haptic } from "@/lib/haptics";
import { queryKeys } from "@/lib/query-keys";
import { showToast } from "@/lib/toast";
import { useTopic } from "@/shared/hooks/useTopic";
import type { EventEnvelope, NotificationView } from "@/shared/types/notifications";

const TOASTS: Partial<Record<NotificationView["type"], string>> = {
  FOLLOW: "Nouvel abonné",
  CHALLENGE_RECEIVED: "Nouveau défi",
  CHALLENGE_DECLINED: "Défi refusé",
  ROOM_ACCEPTED: "Ton défi a été accepté",
  WIZZ: "On te demande dans la salle",
};

/** Inbox en direct : met à jour cloche et défis, annonce ce qui arrive. */
export function RealtimeRuntime() {
  const queryClient = useQueryClient();
  const me = useMe();
  const userId = me.data?.userId;

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.challenges.mine() });
    void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.mine() });
  };

  useTopic<EventEnvelope<NotificationView>>(
    userId ? `/topic/notifications/${userId}` : null,
    (envelope) => {
      refresh();
      const title = envelope.payload?.type ? TOASTS[envelope.payload.type] : undefined;
      if (!title) return;
      haptic("light");
      showToast({ title });
    },
    refresh,
  );

  return null;
}
