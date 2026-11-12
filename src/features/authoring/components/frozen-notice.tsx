import type { StyleProp, ViewStyle } from 'react-native'
import { LockSimpleIcon, Notice } from '@/design-system'
import { usePremiumSheet } from '@/features/premium/premium-store'

/**
 * Sujets gelés (`creation.md` § 3) : sans Premium, au-delà du plafond de sujets publiés, les sujets publiés restent
 * jouables mais ne se modifient plus. Repasser en brouillon jusqu'au plafond, ou Premium, lève le gel.
 */
export function FrozenNotice({ published, limit, style }: { published: number; limit: number; style?: StyleProp<ViewStyle> }) {
  const show = usePremiumSheet((state) => state.show)
  return (
    <Notice
      tone="info"
      icon={LockSimpleIcon}
      title="Sujets gelés"
      message={`Tu as ${published} sujets publiés pour ${limit} sans Premium. Repasse en brouillon pour revenir à ${limit}, ou repasse Premium.`}
      action={{ label: 'Passer Premium', onPress: () => show('frozen') }}
      style={style}
    />
  )
}
