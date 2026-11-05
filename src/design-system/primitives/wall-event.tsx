import { View, type StyleProp, type ViewStyle } from 'react-native'
import { TierMedal } from '../brand/tier-medal'
import type { Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { Text } from './text'

export interface WallEventProps {
  tier: TierCode
  /** Icône de la famille du badge. */
  icon: Icon
  /** Par exemple `Sofia R. a obtenu Éclair · Or`. */
  title: string
  /** Règle et date. */
  context: string
  style?: StyleProp<ViewStyle>
}

/** Événement publié sur le mur, comme un badge gagné en duel. */
export function WallEvent({ tier, icon, title, context, style }: WallEventProps) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap: tokens.space[4], padding: tokens.space[4], borderRadius: radius.lg, backgroundColor: colors.warm },
        style,
      ]}
    >
      <TierMedal tier={tier} icon={icon} size={48} />
      <View style={{ flex: 1, minWidth: 0, gap: tokens.space[1] }}>
        <Text variant="callout" weight="600">
          {title}
        </Text>
        <Text variant="caption" color="muted">
          {context}
        </Text>
      </View>
    </View>
  )
}
