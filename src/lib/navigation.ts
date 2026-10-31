import type { useRouter } from "expo-router";

export const HOME_HREF = "/(app)/(tabs)/(home)";
export const TOPICS_HREF = "/(app)/(tabs)/(topics)/topics";
export const CHALLENGES_HREF = "/(app)/(tabs)/(challenges)/challenges";

/**
 * Quitte le flux de duel (salon, recherche, arène, résultat) : ces écrans sont au-dessus des
 * onglets, les retirer ramène exactement où le joueur était, sans recréer de fiche.
 */
export function leaveDuelFlow(router: ReturnType<typeof useRouter>): void {
  if (router.canDismiss()) router.dismissAll();
  else router.replace(HOME_HREF);
}
