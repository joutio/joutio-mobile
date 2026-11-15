import type { StyleProp, ViewStyle } from 'react-native'
import { LockSimpleIcon, Notice } from '@/design-system'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useT } from '@/lib/i18n'

/**
 * Sujets gelés (`creation.md` § 3) : sans Premium, au-delà du plafond de sujets publiés, les sujets publiés restent
 * jouables mais ne se modifient plus. Repasser en brouillon jusqu'au plafond, ou Premium, lève le gel.
 */
export function FrozenNotice({ published, limit, style }: { published: number; limit: number; style?: StyleProp<ViewStyle> }) {
  const t = useT()
  const show = usePremiumSheet((state) => state.show)
  return (
    <Notice
      tone="info"
      icon={LockSimpleIcon}
      title={t('workshop.frozenTitle')}
      message={t('workshop.frozenText', { count: published, max: limit })}
      action={{ label: t('play.goPremium'), onPress: () => show('frozen') }}
      style={style}
    />
  )
}
