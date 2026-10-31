import type { NotificationView } from "@/shared/types/notifications";
import { CHALLENGES_HREF } from "@/lib/navigation";

export function isUnread(notification: NotificationView): boolean {
  return notification.readAt === null;
}

export function isExpired(notification: NotificationView): boolean {
  if (!notification.expiresAt) return false;
  return Date.parse(notification.expiresAt) <= Date.now();
}

/** Texte de la ligne d'inbox, identique au web. */
export function notificationLabel(
  notification: NotificationView,
  name: string,
): string {
  switch (notification.type) {
    case "FOLLOW":
      return `${name} s'est abonné à toi.`;
    case "CHALLENGE_RECEIVED":
      return notification.gameId
        ? `${name} te demande une revanche !`
        : `${name} te défie !`;
    case "CHALLENGE_DECLINED":
      return `${name} a refusé ton défi.`;
    case "ROOM_ACCEPTED":
      return `${name} a accepté ton défi.`;
    case "WIZZ":
      return `${name} te demande de rejoindre la salle.`;
    case "QUESTION_REPORTED":
      return `${name} a signalé une question d'un de tes sujets.`;
    case "TOPIC_DRAFTED":
      return "Ton sujet est repassé en brouillon : il ne reste plus assez de questions approuvées.";
    case "ACCOUNT_SUSPENDED":
      return "Ton compte a été suspendu.";
    default:
      return "Notification";
  }
}

/** Route d'une notification, `null` quand elle est seulement informative. */
export function notificationTarget(
  notification: NotificationView,
): string | null {
  switch (notification.type) {
    case "FOLLOW":
      return notification.actorId ? `/player/${notification.actorId}` : null;
    case "CHALLENGE_RECEIVED":
      return CHALLENGES_HREF;
    case "ROOM_ACCEPTED":
      if (notification.gameId) return `/(app)/duel/${notification.gameId}`;
      return notification.sourceId ? `/(app)/room/${notification.sourceId}` : null;
    case "WIZZ":
      return notification.sourceId && !isExpired(notification)
        ? `/(app)/room/${notification.sourceId}`
        : null;
    case "QUESTION_REPORTED":
    case "TOPIC_DRAFTED":
      return notification.topicId ? `/topic/${notification.topicId}` : null;
    default:
      return null;
  }
}

/** Horodatage relatif court. */
export function relativeTime(iso: string, now: number): string {
  const minutes = Math.floor((now - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

export interface NotificationGroup {
  title: string;
  items: NotificationView[];
}

/** Regroupe l'inbox en Aujourd'hui, Cette semaine et Plus ancien. */
export function groupNotifications(
  notifications: NotificationView[],
  now: number,
): NotificationGroup[] {
  const startOfDay = new Date(now).setHours(0, 0, 0, 0);
  const startOfWeek = startOfDay - 6 * 24 * 60 * 60 * 1000;
  const groups: NotificationGroup[] = [
    { title: "Aujourd'hui", items: [] },
    { title: "Cette semaine", items: [] },
    { title: "Plus ancien", items: [] },
  ];
  for (const notification of notifications) {
    const createdAt = Date.parse(notification.createdAt);
    const index =
      createdAt >= startOfDay ? 0 : createdAt >= startOfWeek ? 1 : 2;
    groups[index].items.push(notification);
  }
  return groups.filter((group) => group.items.length > 0);
}
