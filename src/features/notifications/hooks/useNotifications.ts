import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { notificationsService } from "@/lib/services/notifications";
import { profilesService } from "@/lib/services/profiles";

const PAGE_SIZE = 20;
const UNREAD_POLL_MS = 30_000;
const PROFILE_STALE_MS = 5 * 60 * 1000;

export function useNotifications() {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.list(),
    queryFn: ({ pageParam }) =>
      notificationsService.list(pageParam, PAGE_SIZE),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
    staleTime: 0,
  });
}

/** Compteur de la cloche, sondé jusqu'à l'arrivée du temps réel (M5). */
export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsService.unreadCount(),
    select: (data) => data.count,
    staleTime: 0,
    refetchInterval: UNREAD_POLL_MS,
  });
}

/** Pseudonyme de l'auteur, résolu à la ligne comme sur le web. */
export function useActorName(actorId: string | null) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(actorId ?? ""),
    queryFn: () => profilesService.get(actorId ?? ""),
    enabled: !!actorId,
    select: (profile) => profile.pseudonym,
    staleTime: PROFILE_STALE_MS,
  });
}

function useInvalidateInbox() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all,
    });
}

export function useMarkNotificationRead() {
  const invalidate = useInvalidateInbox();
  return useMutation({
    mutationFn: (notificationId: string) =>
      notificationsService.markRead(notificationId),
    onSettled: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const invalidate = useInvalidateInbox();
  return useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSettled: invalidate,
  });
}
