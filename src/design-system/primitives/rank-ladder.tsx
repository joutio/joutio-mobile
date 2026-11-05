import { View, type StyleProp, type ViewStyle } from 'react-native'
import { TierMedal } from '../brand/tier-medal'
import type { Icon } from '../icons'
import { HAIRLINE } from '../theme/hairline'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Text } from './text'

export interface LadderRung {
  tier: TierCode
  /** Condition du palier. */
  rule: string
  /** `Acquis`, avancement ou tiret. */
  status: string
  /** Médaille pleine, sinon verrouillée. */
  earned?: boolean
}

export interface RankLadderProps {
  rungs: readonly LadderRung[]
  /** Icône de la famille de badges, portée par chaque médaille. */
  icon?: Icon
  style?: StyleProp<ViewStyle>
}

/** Les paliers d'un badge, du Fer au Diamant, chacun avec sa médaille. */
export function RankLadder({ rungs, icon, style }: RankLadderProps) {
  const { colors, radius } = useTheme()
  return (
    <View style={[{ overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.raised }, style]}>
      {rungs.map((rung, index) => (
        <View
          key={rung.tier}
          accessible
          accessibilityLabel={[tokens.tier[rung.tier].label, rung.rule, rung.status].join(', ')}
          style={{
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[4],
            paddingHorizontal: tokens.space[5],
            paddingVertical: tokens.space[3],
            borderBottomWidth: index < rungs.length - 1 ? HAIRLINE : 0,
            borderBottomColor: colors.border,
          }}
        >
          <TierMedal tier={rung.tier} icon={icon} size={44} state={rung.earned ? 'earned' : 'locked'} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="body" numberOfLines={1}>
              {tokens.tier[rung.tier].label}
            </Text>
            <Text variant="caption" color="muted" numberOfLines={1}>
              {rung.rule}
            </Text>
          </View>
          <Text variant="body" color="muted" numberOfLines={1}>
            {rung.status}
          </Text>
        </View>
      ))}
    </View>
  )
}
