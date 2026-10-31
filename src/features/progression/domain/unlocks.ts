import { eloTier } from "@/shared/utils/elo";
import type { BadgeCollectionView } from "@/shared/types/bff";
import { getItem, setItem } from "@/lib/storage";

export type Unlock =
  | { kind: "rank"; tier: string; from: string; rating: number }
  | {
      kind: "badge";
      tier: string;
      family: string;
      label: string;
      next: string | null;
    };

interface Known {
  badges: string[];
  rating: number;
}

const key = (userId: string) => `joutio.unlocks.${userId}`;

/** Compare à l'état vu au dernier passage : le premier relevé ne déclenche rien. */
export async function collectUnlocks(
  userId: string,
  collection: BadgeCollectionView,
  rating: number,
): Promise<Unlock[]> {
  const stored = await getItem(key(userId));
  const known = stored ? (JSON.parse(stored) as Known) : null;
  const earned = collection.families.flatMap((family) =>
    family.badges
      .filter((badge) => badge.earned)
      .map((badge) => ({ ...badge, family: family.family, ladder: family.badges })),
  );
  await setItem(
    key(userId),
    JSON.stringify({ badges: earned.map((badge) => badge.code), rating }),
  );
  if (!known) return [];

  const unlocks: Unlock[] = [];
  const before = eloTier(known.rating);
  const after = eloTier(rating);
  if (rating > known.rating && before !== after) {
    unlocks.push({ kind: "rank", tier: after, from: before, rating });
  }
  for (const badge of earned) {
    if (known.badges.includes(badge.code)) continue;
    const next = badge.ladder.find((item) => !item.earned);
    unlocks.push({
      kind: "badge",
      tier: badge.tier,
      family: badge.family,
      label: badge.label,
      next: next ? `${next.progress} / ${next.target}` : null,
    });
  }
  return unlocks;
}
