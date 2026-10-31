import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  ActivityView,
  BadgeCollectionView,
  RewardView,
  TitlesView,
} from "@/shared/types/bff";

/** Collection du joueur : badges, série, titres et récompenses. */
export const progressionService = {
  badges: (userId: string): Promise<BadgeCollectionView> =>
    api.get<BadgeCollectionView>(ENDPOINTS.profiles.badges(userId)),

  activity: (userId: string): Promise<ActivityView> =>
    api.get<ActivityView>(ENDPOINTS.profiles.activity(userId)),

  titles: (userId: string): Promise<TitlesView> =>
    api.get<TitlesView>(ENDPOINTS.profiles.titles(userId)),

  equipTitle: (userId: string, titleKey: string | null): Promise<void> =>
    api.put<void>(ENDPOINTS.profiles.title(userId), { titleKey }),

  rewards: (): Promise<{ rewards: RewardView[] }> =>
    api.get<{ rewards: RewardView[] }>(ENDPOINTS.rewards),
};
