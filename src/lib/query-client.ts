import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient, type Query } from "@tanstack/react-query";

const PERSISTED_ROOTS = new Set(["me", "home", "topics"]);
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: MAX_AGE_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/** Rouvre Accueil et Sujets sur leur dernier état ; `queryClient.clear()` purge aussi le disque. */
export const persistOptions = {
  persister: createAsyncStoragePersister({
    storage: AsyncStorage,
    key: "joutio.query-cache",
  }),
  maxAge: MAX_AGE_MS,
  buster: "1",
  dehydrateOptions: {
    shouldDehydrateQuery: (query: Query) =>
      query.state.status === "success" &&
      PERSISTED_ROOTS.has(String(query.queryKey[0])),
  },
};
