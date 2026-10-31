import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type { IdResponse } from "@/shared/types/api";
import type { ChallengeView } from "@/shared/types/bff";

/** Défis nominatifs : consultation, acceptation, refus et annulation. */
export const challengesService = {
  create: (params: {
    topicId: string;
    opponentId: string;
    gameId?: string;
  }): Promise<IdResponse> =>
    api.post<IdResponse>(ENDPOINTS.challenges.create, params),

  mine: (): Promise<ChallengeView[]> =>
    api.get<ChallengeView[]>(ENDPOINTS.challenges.mine),

  get: (challengeId: string): Promise<ChallengeView> =>
    api.get<ChallengeView>(ENDPOINTS.challenges.detail(challengeId)),

  accept: (challengeId: string): Promise<void> =>
    api.post<void>(ENDPOINTS.challenges.accept(challengeId)),

  decline: (challengeId: string): Promise<void> =>
    api.post<void>(ENDPOINTS.challenges.decline(challengeId)),

  cancel: (challengeId: string): Promise<void> =>
    api.post<void>(ENDPOINTS.challenges.cancel(challengeId)),
};
