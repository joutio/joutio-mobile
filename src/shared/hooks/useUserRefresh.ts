import { useState } from "react";

/** Rafraîchissement demandé par le joueur, distinct du sondage de fond. */
export function useUserRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };

  return { refreshing, onRefresh };
}
