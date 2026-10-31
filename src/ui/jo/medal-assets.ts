/* eslint-disable @typescript-eslint/no-require-imports */
/** Images pré-rendues depuis `design/assets` par `npm run render:medals`. */
export const BADGE_IMAGE: Record<string, number> = {
  FER: require("../../../assets/medals/badge-fer.png"),
  BRONZE: require("../../../assets/medals/badge-bronze.png"),
  ARGENT: require("../../../assets/medals/badge-argent.png"),
  OR: require("../../../assets/medals/badge-or.png"),
  PLATINE: require("../../../assets/medals/badge-platine.png"),
  EMERAUDE: require("../../../assets/medals/badge-emeraude.png"),
  DIAMANT: require("../../../assets/medals/badge-diamant.png"),
};

export const RIBBON_IMAGE: Record<string, number> = {
  FER: require("../../../assets/medals/ruban-fer.png"),
  BRONZE: require("../../../assets/medals/ruban-bronze.png"),
  ARGENT: require("../../../assets/medals/ruban-argent.png"),
  OR: require("../../../assets/medals/ruban-or.png"),
  PLATINE: require("../../../assets/medals/ruban-platine.png"),
  EMERAUDE: require("../../../assets/medals/ruban-emeraude.png"),
  DIAMANT: require("../../../assets/medals/ruban-diamant.png"),
};
