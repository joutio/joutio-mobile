import { Href, useRouter } from "expo-router";
import { showToast } from "@/lib/toast";
import { useAcceptChallenge } from "@/features/challenges/hooks/useChallenges";
import { AppButton } from "@/ui/button";
import { JoPlayerRow } from "@/ui/jo/jo-player-row";
import type { NotificationView } from "@/shared/types/notifications";
import {
  isExpired,
  isUnread,
  notificationLabel,
  notificationTarget,
  relativeTime,
} from "../domain/notification";
import {
  useActorName,
  useMarkNotificationRead,
} from "../hooks/useNotifications";

interface NotificationRowProps {
  notification: NotificationView;
  now: number;
  last: boolean;
}

/** Ligne d'inbox : ouvrir vaut lecture, un défi reçu s'accepte directement. */
export function NotificationRow({
  notification,
  now,
  last,
}: NotificationRowProps) {
  const router = useRouter();
  const actor = useActorName(notification.actorId);
  const markRead = useMarkNotificationRead();
  const accept = useAcceptChallenge();
  const unread = isUnread(notification);
  const target = notificationTarget(notification);
  const name = actor.data ?? "Un joueur";
  const challengeId =
    notification.type === "CHALLENGE_RECEIVED" && !isExpired(notification)
      ? notification.sourceId
      : null;

  const read = () => {
    if (unread) markRead.mutate(notification.notificationId);
  };

  return (
    <JoPlayerRow
      name={notificationLabel(notification, name)}
      avatarName={name}
      nameLines={3}
      subtitle={relativeTime(notification.createdAt, now)}
      highlight={unread}
      last={last}
      onPress={
        unread || target
          ? () => {
              read();
              if (target) router.push(target as Href);
            }
          : undefined
      }
      trailing={
        challengeId ? (
          <AppButton
            label="Jouer"
            size="sm"
            loading={accept.isPending}
            onPress={() =>
              accept.mutate(challengeId, {
                onSuccess: (roomId) => {
                  read();
                  if (roomId) router.push(`/(app)/room/${roomId}`);
                  else
                    showToast({
                      title: "Ce défi n'est plus disponible.",
                      tone: "danger",
                    });
                },
                onError: () =>
                  showToast({
                    title: "Action impossible, réessaie.",
                    tone: "danger",
                  }),
              })
            }
          />
        ) : undefined
      }
    />
  );
}
