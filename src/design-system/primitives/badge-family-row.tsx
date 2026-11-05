import { View, type StyleProp, type ViewStyle } from 'react-native'
import { TierMedal } from '../brand/tier-medal'
import type { Icon } from '../icons'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { ProgressBar } from './progress-bar'
import { Text } from './text'

const TIERS = Object.keys(tokens.tier) as TierCode[]

export interface BadgeFamilyRowProps {
  name: string
  icon: Icon
  /** Avancement, par exemple `Or · 30 / 100`. */
  meta: string
  /** Nombre de paliers acquis, de 0 à 7. */
  earned: number
  /** Avancement vers le palier suivant, en %. */
  progress: number
  /** Toute la ligne ouvre la fiche de la famille. */
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** Une famille de badges et ses 7 paliers. */
export function BadgeFamilyRow({ name, icon, meta, earned, progress, onPress, style }: BadgeFamilyRowProps) {
  const { colors, radius } = useTheme()
  const next = TIERS[earned]
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={`${name}, ${meta}`}
      disabled={!onPress}
      onPress={onPress}
      pressedScale={0.98}
      ripple
      style={({ pressed }) => [
        {
          gap: tokens.space[4],
          overflow: 'hidden',
          borderRadius: radius.lg,
          backgroundColor: pressed ? colors.hover : colors.surface,
          paddingHorizontal: tokens.space[5],
          paddingTop: tokens.space[4],
          paddingBottom: tokens.space[5],
        },
        style,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: tokens.space[3] }}>
        <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
          {name}
        </Text>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {TIERS.map((tier, index) => (
          <TierMedal key={tier} tier={tier} icon={icon} size={40} state={index < earned ? 'earned' : 'locked'} />
        ))}
      </View>
      {next && <ProgressBar value={progress} tone={next} accessibilityLabel={`${name} · vers ${tokens.tier[next].label}`} />}
    </PressableScale>
  )
}
