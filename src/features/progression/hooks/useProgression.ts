import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { progressionService } from "@/lib/services/progression";
import { showToast } from "@/lib/toast";
import { masteryTierLabel } from "@/shared/utils/mastery";
import { topicName } from "@/shared/utils/topic-name";
import type { Language, TitleView } from "@/shared/types/bff";

const STALE_MS = 60_000;

export function useBadges(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.badges(userId ?? ""),
    queryFn: () => progressionService.badges(userId ?? ""),
    enabled: !!userId,
    staleTime: STALE_MS,
  });
}

export function useActivity(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.activity(userId ?? ""),
    queryFn: () => progressionService.activity(userId ?? ""),
    enabled: !!userId,
    staleTime: STALE_MS,
  });
}

export function useTitles(userId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.profiles.titles(userId ?? ""),
    queryFn: () => progressionService.titles(userId ?? ""),
    enabled: !!userId,
    staleTime: STALE_MS,
  });
}

export function useRewards() {
  return useQuery({
    queryKey: queryKeys.rewards(),
    queryFn: () => progressionService.rewards(),
    select: (data) => data.rewards,
    staleTime: STALE_MS,
  });
}

export function useEquipTitle(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (titleKey: string | null) =>
      progressionService.equipTitle(userId ?? "", titleKey),
    onError: () => showToast({ title: "Titre impossible à porter.", tone: "danger" }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.me() });
    },
  });
}

/** Libellé d'un titre : nom du sujet pour ce palier, sinon palier et sujet. */
export function titleName(title: TitleView, language: Language): string {
  const names = title.topic.titles?.[language] ?? title.topic.titles?.fr;
  return (
    names?.[title.tier] ??
    `${masteryTierLabel(title.tier)} · ${topicName(title.topic.names, language)}`
  );
}
