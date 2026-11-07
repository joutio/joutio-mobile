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

/** Extrémités fixes et motif central répétable, dérivés des SVG du lab. */
export const RIBBON_PART_ASSETS: Record<TierCode, { left: number; center: number; right: number }> = {
  FER: {
    left: require('../../../assets/brand/ruban/parts/ruban-fer-left.png'),
    center: require('../../../assets/brand/ruban/parts/ruban-fer-center.png'),
    right: require('../../../assets/brand/ruban/parts/ruban-fer-right.png'),
  },
  BRONZE: {
    left: require('../../../assets/brand/ruban/parts/ruban-bronze-left.png'),
    center: require('../../../assets/brand/ruban/parts/ruban-bronze-center.png'),
    right: require('../../../assets/brand/ruban/parts/ruban-bronze-right.png'),
  },
  ARGENT: {
    left: require('../../../assets/brand/ruban/parts/ruban-argent-left.png'),
    center: require('../../../assets/brand/ruban/parts/ruban-argent-center.png'),
    right: require('../../../assets/brand/ruban/parts/ruban-argent-right.png'),
  },
  OR: {
    left: require('../../../assets/brand/ruban/parts/ruban-or-left.png'),
    center: require('../../../assets/brand/ruban/parts/ruban-or-center.png'),
    right: require('../../../assets/brand/ruban/parts/ruban-or-right.png'),
  },
  PLATINE: {
    left: require('../../../assets/brand/ruban/parts/ruban-platine-left.png'),
    center: require('../../../assets/brand/ruban/parts/ruban-platine-center.png'),
    right: require('../../../assets/brand/ruban/parts/ruban-platine-right.png'),
  },
  EMERAUDE: {
    left: require('../../../assets/brand/ruban/parts/ruban-emeraude-left.png'),
    center: require('../../../assets/brand/ruban/parts/ruban-emeraude-center.png'),
    right: require('../../../assets/brand/ruban/parts/ruban-emeraude-right.png'),
  },
  DIAMANT: {
    left: require('../../../assets/brand/ruban/parts/ruban-diamant-left.png'),
    center: require('../../../assets/brand/ruban/parts/ruban-diamant-center.png'),
    right: require('../../../assets/brand/ruban/parts/ruban-diamant-right.png'),
  },
}
