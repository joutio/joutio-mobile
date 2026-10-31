/**
 * Paliers de maîtrise d'un sujet (`MasteryTier` backend) et libellés FR.
 * Le serveur n'envoie jamais le libellé composé : le client combine le palier et le sujet.
 */
export const MASTERY_TIERS = [
  "FER",
  "BRONZE",
  "ARGENT",
  "OR",
  "PLATINE",
  "EMERAUDE",
  "DIAMANT",
] as const;

export type MasteryTier = (typeof MASTERY_TIERS)[number];

const MASTERY_TIER_LABELS: Record<MasteryTier, string> = {
  FER: "Fer",
  BRONZE: "Bronze",
  ARGENT: "Argent",
  OR: "Or",
  PLATINE: "Platine",
  EMERAUDE: "Émeraude",
  DIAMANT: "Diamant",
};

export function masteryTierLabel(tier: string | null | undefined): string {
  if (!tier) return "Fer";
  return MASTERY_TIER_LABELS[tier as MasteryTier] ?? "Fer";
}

/** Rang de maîtrise 0-based (pour une frise éventuelle). */
export function masteryTierIndex(tier: string | null | undefined): number {
  if (!tier) return 0;
  const index = MASTERY_TIERS.indexOf(tier as MasteryTier);
  return index >= 0 ? index : 0;
}
