import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  HeadToHeadView,
  Page,
  PlayerCardView,
  PlayerProfileView,
} from "@/shared/types/bff";

export type FollowDirection = "following" | "followers";

const PEOPLE_PAGE_SIZE = 30;

/** Joueurs : fiche, listes de suivi, suivi et face-à-face. */
export const profilesService = {
  get: (userId: string): Promise<PlayerProfileView> =>
    api.get<PlayerProfileView>(ENDPOINTS.profiles.detail(userId)),

  people: (
    userId: string,
    direction: FollowDirection,
    q: string,
    page: number,
  ): Promise<Page<PlayerCardView>> =>
    api.get<Page<PlayerCardView>>(ENDPOINTS.profiles[direction](userId), {
      params: { q: q.trim() || undefined, page, size: PEOPLE_PAGE_SIZE },
    }),

  follow: (userId: string): Promise<void> =>
    api.put<void>(ENDPOINTS.profiles.follow(userId)),

  unfollow: (userId: string): Promise<void> =>
    api.delete<void>(ENDPOINTS.profiles.follow(userId)),

  headToHead: (userId: string, against: string): Promise<HeadToHeadView> =>
    api.get<HeadToHeadView>(ENDPOINTS.profiles.headToHead(userId), {
      params: { against },
    }),
};
