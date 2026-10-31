import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { Page } from "@/shared/types/bff";
import type { NotificationView } from "@/shared/types/notifications";

/** Inbox personnelle : pages, compteur de non lues et lecture. */
export const notificationsService = {
  list: (page: number, size: number): Promise<Page<NotificationView>> =>
    api.get<Page<NotificationView>>(ENDPOINTS.notifications.list, {
      params: { page, size },
    }),

  unreadCount: (): Promise<{ count: number }> =>
    api.get<{ count: number }>(ENDPOINTS.notifications.unreadCount),

  markRead: (notificationId: string): Promise<void> =>
    api.post<void>(ENDPOINTS.notifications.read(notificationId)),

  markAllRead: (): Promise<void> =>
    api.post<void>(ENDPOINTS.notifications.readAll),
};
