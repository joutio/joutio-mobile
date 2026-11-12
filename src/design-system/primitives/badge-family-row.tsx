import { View, type StyleProp, type ViewStyle } from 'react-native'
import { TierMedal } from '../brand/tier-medal'
import type { Icon } from '../icons'
import { mix } from '../theme/color'
import { useTheme } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { ProgressBar } from './progress-bar'
import { Text } from './text'

const TIERS = Object.keys(tokens.tier) as TierCode[]

export interface BadgeFamilyRowProps {
  name: string
  icon: Icon
  /** Nombre de paliers acquis, de 0 à 7 : le dernier s'affiche à droite (Fer, Bronze… Diamant). */
  earned: number
  /** Avancement vers le palier suivant, en %. */
  progress: number
  /** Ce qui reste avant le palier suivant, au-dessus de la barre, comme `TitleRow` : « Encore 70 réponses rapides ». */
  remaining?: string
  /**
   * Famille sans échelle (Exploits) : hauts faits ponctuels, chacun à son palier, acquis dans n'importe quel ordre.
   * Seules leurs médailles, le compte à droite (« 2 / 4 »), ni barre ni « Encore ». `earned` et `progress` sont ignorés.
   */
  feats?: readonly { tier: TierCode; earned: boolean }[]
  /** Toute la ligne ouvre la fiche de la famille. */
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/**
 * Une famille de badges et ses 7 paliers (lab, 2026-11-12) : à droite le dernier palier acquis, dans sa couleur ; sous
 * les médailles, ce qui reste avant le palier suivant puis la barre. Exploits : leurs médailles et le compte.
 */
export function BadgeFamilyRow({ name, icon, earned, progress, remaining, feats, onPress, style }: BadgeFamilyRowProps) {
  const { colors, radius } = useTheme()
  const featCount = feats ? `${feats.filter((feat) => feat.earned).length} / ${feats.length}` : undefined
  const next = feats ? undefined : TIERS[earned]
  const reached = !feats && earned > 0 ? TIERS[earned - 1] : undefined
  const summary = [name, featCount, reached ? tokens.tier[reached].label : undefined, next ? remaining : undefined].filter(Boolean).join(', ')
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : 'summary'}
      accessibilityLabel={summary}
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
        {featCount && (
          <Text variant="caption" color="muted" weight="600" numberOfLines={1}>
            {featCount}
          </Text>
        )}
        {reached && (
          <Text variant="caption" weight="600" numberOfLines={1} style={{ color: mix(tokens.tier[reached].hex, colors.text, 0.6) }}>
            {tokens.tier[reached].label}
          </Text>
        )}
      </View>
      <View
        style={{ flexDirection: 'row', justifyContent: feats ? 'flex-start' : 'space-between', gap: feats ? tokens.space[5] : 0 }}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {feats
          ? feats.map((feat, index) => <TierMedal key={index} tier={feat.tier} icon={icon} size={40} state={feat.earned ? 'earned' : 'locked'} />)
          : TIERS.map((tier, index) => <TierMedal key={tier} tier={tier} icon={icon} size={40} state={index < earned ? 'earned' : 'locked'} />)}
      </View>
      {next && <ProgressBar value={progress} tone={next} label={remaining} accessibilityLabel={`${name} · vers ${tokens.tier[next].label}`} />}
    </PressableScale>
  )
}
