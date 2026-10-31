import type { TierCode } from "@/ui/tokens";

const ELO_TIERS: readonly { tier: TierCode; min: number }[] = [
  { tier: "FER", min: 0 },
  { tier: "BRONZE", min: 400 },
  { tier: "ARGENT", min: 600 },
  { tier: "OR", min: 800 },
  { tier: "PLATINE", min: 1000 },
  { tier: "EMERAUDE", min: 1200 },
  { tier: "DIAMANT", min: 1400 },
];

/** Prochain palier Elo, `null` au sommet. */
export function nextEloTier(rating: number) {
  return ELO_TIERS.find((entry) => entry.min > rating) ?? null;
}

/** Progression (0–100) dans le palier courant. */
export function eloProgressPercent(rating: number): number {
  const next = nextEloTier(rating);
  if (!next) return 100;
  const current = ELO_TIERS[ELO_TIERS.indexOf(next) - 1];
  return Math.round(((rating - current.min) / (next.min - current.min)) * 100);
}

export const ELO_LADDER = ELO_TIERS.map((entry) => entry.tier);

/** Palier Elo, identique à `joutio-web` (`shared/elo`). */
export function eloTier(rating: number): TierCode {
  return ELO_TIERS.reduce<TierCode>(
    (current, entry) => (rating >= entry.min ? entry.tier : current),
    "FER",
  );
}
