import type { TierCode } from '../tokens.generated'

/** Médailles et rubans par palier, PNG rendus depuis `design/public/brand` par `npm run assets:sync`. */
export const MEDAL_ASSETS: Record<TierCode, number> = {
  FER: require('../../../assets/brand/badge/badge-fer.png'),
  BRONZE: require('../../../assets/brand/badge/badge-bronze.png'),
  ARGENT: require('../../../assets/brand/badge/badge-argent.png'),
  OR: require('../../../assets/brand/badge/badge-or.png'),
  PLATINE: require('../../../assets/brand/badge/badge-platine.png'),
  EMERAUDE: require('../../../assets/brand/badge/badge-emeraude.png'),
  DIAMANT: require('../../../assets/brand/badge/badge-diamant.png'),
}

export const RIBBON_ASSETS: Record<TierCode, number> = {
  FER: require('../../../assets/brand/ruban/ruban-fer.png'),
  BRONZE: require('../../../assets/brand/ruban/ruban-bronze.png'),
  ARGENT: require('../../../assets/brand/ruban/ruban-argent.png'),
  OR: require('../../../assets/brand/ruban/ruban-or.png'),
  PLATINE: require('../../../assets/brand/ruban/ruban-platine.png'),
  EMERAUDE: require('../../../assets/brand/ruban/ruban-emeraude.png'),
  DIAMANT: require('../../../assets/brand/ruban/ruban-diamant.png'),
}
