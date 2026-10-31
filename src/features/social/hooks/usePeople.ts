import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  profilesService,
  type FollowDirection,
} from "@/lib/services/profiles";

const PEOPLE_POLL_MS = 30_000;

export function usePeople(
  userId: string | undefined,
  direction: FollowDirection,
  q: string,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.profiles.people(userId ?? "", direction, q),
    queryFn: ({ pageParam }) =>
      profilesService.people(userId ?? "", direction, q, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
    enabled: !!userId,
    staleTime: 0,
    refetchInterval: PEOPLE_POLL_MS,
    placeholderData: keepPreviousData,
  });
}

export function usePlayer(userId: string) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(userId),
    queryFn: () => profilesService.get(userId),
    enabled: !!userId,
    staleTime: 0,
  });
}

export function useHeadToHead(userId: string | undefined, against: string) {
  return useQuery({
    queryKey: queryKeys.profiles.headToHead(userId ?? "", against),
    queryFn: () => profilesService.headToHead(userId ?? "", against),
    enabled: !!userId && !!against,
    staleTime: 60_000,
  });
}

export function useToggleFollow(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) =>
      follow ? profilesService.follow(userId) : profilesService.unfollow(userId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}
