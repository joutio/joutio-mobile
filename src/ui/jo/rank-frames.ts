/* eslint-disable @typescript-eslint/no-require-imports */
/** Cadres pré-rendus par `npm run render:frames` depuis la spec `Elo Avatar`. */
interface RankFrame {
  /** Marge de l'image de l'avatar dans son cadre, en fraction de la taille. */
  inset: number;
  frame?: number;
  spin?: { source: number; duration: number };
  counter?: { source: number; duration: number };
  pulse?: boolean;
}

export const RANK_FRAMES: Record<string, RankFrame> = {
  FER: { inset: 0.05 },
  BRONZE: { inset: 0.075, frame: require("../../../assets/frames/bronze.png") },
  ARGENT: { inset: 0.08, frame: require("../../../assets/frames/argent.png") },
  OR: { inset: 0.085, frame: require("../../../assets/frames/or.png") },
  PLATINE: {
    inset: 0.09,
    frame: require("../../../assets/frames/platine.png"),
    spin: { source: require("../../../assets/frames/platine-spin.png"), duration: 5000 },
  },
  EMERAUDE: {
    inset: 0.095,
    frame: require("../../../assets/frames/emeraude.png"),
    spin: { source: require("../../../assets/frames/emeraude-spin.png"), duration: 4500 },
  },
  DIAMANT: {
    inset: 0.1,
    frame: require("../../../assets/frames/diamant.png"),
    spin: { source: require("../../../assets/frames/diamant-spin.png"), duration: 7000 },
    counter: { source: require("../../../assets/frames/diamant-counter.png"), duration: 3500 },
    pulse: true,
  },
};
