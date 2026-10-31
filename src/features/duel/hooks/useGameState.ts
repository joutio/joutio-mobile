import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { gamesService } from "@/lib/services/games";
import { useStompStore } from "@/lib/ws";
import { useTopic } from "@/shared/hooks/useTopic";
import type { EventEnvelope, GameNotification } from "@/shared/types/notifications";
import { foldGameEnvelopes } from "../domain/game";

/** Filet de sécurité REST quand le push STOMP tient. */
const SAFETY_POLL_MS = 10_000;

/**
 * État d'une partie reconstruit par fold des notifications REST.
 *
 * <p>STOMP pousse les événements dans le même cache ; le REST rattrape une coupure et reste
 * sondé à ~900 ms tant que la connexion n'est pas établie.</p>
 */
export function useGameState(gameId: string) {
  const queryClient = useQueryClient();
  const connected = useStompStore((state) => state.connected);
  const queryKey = queryKeys.games.notifications(gameId);

  useTopic<EventEnvelope<GameNotification>>(
    gameId ? `/topic/games/${gameId}` : null,
    (envelope) =>
      queryClient.setQueryData<EventEnvelope<GameNotification>[]>(
        queryKey,
        (current) => [...(current ?? []), envelope],
      ),
    () => void queryClient.invalidateQueries({ queryKey }),
  );

  const query = useQuery({
    queryKey,
    queryFn: () => gamesService.notifications(gameId),
    enabled: !!gameId,
    staleTime: 0,
    refetchInterval: (current) => {
      const envelopes = current.state.data;
      const terminal = envelopes?.some(
        (envelope) =>
          envelope.payload.type === "GAME_ENDED" ||
          envelope.payload.type === "GAME_CANCELLED",
      );
      if (terminal) return false;
      return connected ? SAFETY_POLL_MS : 900;
    },
    retry: (failureCount, error) => {
      const status = (error as { statusCode?: number }).statusCode;
      return status === 404 ? failureCount < 12 : failureCount < 2;
    },
    retryDelay: 500,
  });

  const game = useMemo(
    () => foldGameEnvelopes(gameId, query.data ?? []),
    [gameId, query.data],
  );

  return {
    game,
    isLoading: query.isPending,
    isError: query.isError && !query.data,
    refresh: () => {
      void query.refetch();
    },
  };
}
