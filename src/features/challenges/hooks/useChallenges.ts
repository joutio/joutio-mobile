import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { haptic } from "@/lib/haptics";
import { queryKeys } from "@/lib/query-keys";
import { challengesService } from "@/lib/services/challenges";
import { roomsService } from "@/lib/services/rooms";
import { showToast } from "@/lib/toast";
import { useNow } from "@/shared/hooks/useNow";
import { splitPending } from "../domain/challenge";

const POLL_MS = 15_000;
const ROOM_ATTEMPTS = 12;
const ROOM_RETRY_MS = 400;

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Défis et salons ouverts : alimente l'onglet Défis et sa pastille. */
export function usePendingChallenges() {
  const me = useMe();
  const now = useNow(30_000);
  const challenges = useQuery({
    queryKey: queryKeys.challenges.mine(),
    queryFn: () => challengesService.mine(),
    staleTime: 0,
    refetchInterval: POLL_MS,
  });
  const rooms = useQuery({
    queryKey: queryKeys.rooms.mine(),
    queryFn: () => roomsService.mine(),
    staleTime: 0,
    refetchInterval: POLL_MS,
  });

  const pending = useMemo(
    () =>
      splitPending(
        challenges.data ?? [],
        rooms.data ?? [],
        me.data?.userId,
        now,
      ),
    [challenges.data, me.data?.userId, now, rooms.data],
  );

  return {
    ...pending,
    now,
    isPending: challenges.isPending || rooms.isPending,
    isError: challenges.isError || rooms.isError,
    isRefetching: challenges.isRefetching || rooms.isRefetching,
    refetch: () =>
      Promise.all([challenges.refetch(), rooms.refetch()]),
  };
}

/** Attend la salle créée par la saga juste après l'acceptation. */
async function waitForRoom(challengeId: string): Promise<string | null> {
  for (let attempt = 0; attempt < ROOM_ATTEMPTS; attempt += 1) {
    const challenge = await challengesService.get(challengeId);
    if (challenge.roomId) return challenge.roomId;
    if (challenge.status !== "PENDING" && challenge.status !== "ACCEPTED") {
      return null;
    }
    await wait(ROOM_RETRY_MS);
  }
  return null;
}

function useReconcile() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.challenges.mine(),
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.rooms.mine() });
  };
}

/** Accepte un défi encore ouvert puis renvoie sa salle (`null` si elle n'arrive pas). */
export function useAcceptChallenge() {
  const reconcile = useReconcile();
  return useMutation({
    mutationFn: async (challengeId: string) => {
      const challenge = await challengesService.get(challengeId);
      if (challenge.status === "PENDING") {
        await challengesService.accept(challengeId);
      } else if (challenge.status !== "ACCEPTED") {
        return null;
      }
      return waitForRoom(challengeId);
    },
    onSettled: reconcile,
  });
}

export function useDeclineChallenge() {
  const reconcile = useReconcile();
  return useMutation({
    mutationFn: (challengeId: string) => challengesService.decline(challengeId),
    onSettled: reconcile,
  });
}

export function useCancelChallenge() {
  const reconcile = useReconcile();
  return useMutation({
    mutationFn: (challengeId: string) => challengesService.cancel(challengeId),
    onSettled: reconcile,
  });
}

/** Défi nominatif : le quota et le doublon reviennent du BFF avec leur message. */
export function useCreateChallenge() {
  const reconcile = useReconcile();
  return useMutation({
    mutationFn: challengesService.create,
    onSuccess: () => {
      haptic("success");
      showToast({ title: "Défi envoyé", tone: "success" });
    },
    onError: (error: { statusCode?: number }) =>
      showToast({
        title:
          error.statusCode === 429
            ? "Limite de défis atteinte"
            : error.statusCode === 409
              ? "Un défi est déjà en attente sur ce sujet"
              : "Défi impossible, réessaie.",
        tone: "danger",
      }),
    onSettled: reconcile,
  });
}
