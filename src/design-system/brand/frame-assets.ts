import type { ImageSourcePropType } from 'react-native'
import type { TierCode } from '../tokens.generated'

/** PNG rendus depuis `design/public/brand/frame` par `npm run assets:sync`. */
export const FRAME_ASSETS: Record<
  Exclude<TierCode, 'FER'>,
  { base: ImageSourcePropType; spin?: ImageSourcePropType; counter?: ImageSourcePropType; halo?: ImageSourcePropType }
> = {
  BRONZE: { base: require('../../../assets/brand/frame/frame-bronze.png') },
  ARGENT: { base: require('../../../assets/brand/frame/frame-argent.png') },
  OR: { base: require('../../../assets/brand/frame/frame-or.png') },
  PLATINE: {
    base: require('../../../assets/brand/frame/frame-platine.png'),
    spin: require('../../../assets/brand/frame/frame-platine-spin.png'),
  },
  EMERAUDE: {
    base: require('../../../assets/brand/frame/frame-emeraude.png'),
    spin: require('../../../assets/brand/frame/frame-emeraude-spin.png'),
  },
  DIAMANT: {
    base: require('../../../assets/brand/frame/frame-diamant.png'),
    spin: require('../../../assets/brand/frame/frame-diamant-spin.png'),
    counter: require('../../../assets/brand/frame/frame-diamant-counter.png'),
    halo: require('../../../assets/brand/frame/frame-diamant-halo.png'),
  },
}
