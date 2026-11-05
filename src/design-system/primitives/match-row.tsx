import { View, type StyleProp, type ViewStyle } from 'react-native'
import { CategoryIcon } from '../brand/category-icon'
import { RobotIcon } from '../icons'
import { HAIRLINE } from '../theme/hairline'
import { useTheme, type ThemeColors } from '../theme/theme-provider'
import { tokens, type CategoryCode } from '../tokens.generated'
import { PressableScale } from './pressable-scale'
import { Text } from './text'

export type MatchOutcome = 'win' | 'loss' | 'draw' | 'forfeit'

const OUTCOMES: Record<MatchOutcome, { label: string; color: keyof ThemeColors }> = {
  win: { label: 'Victoire', color: 'correct' },
  loss: { label: 'Défaite', color: 'wrong' },
  draw: { label: 'Égalité', color: 'muted' },
  forfeit: { label: 'Abandon', color: 'muted' },
}

export interface MatchRowProps {
  /** Titre de la ligne : le sujet, ou l'adversaire quand la liste est déjà filtrée sur un sujet. */
  topic: string
  category: CategoryCode
  sub?: string
  outcome: MatchOutcome
  score: string
  bot?: boolean
  /** Dernière ligne de la liste : sans filet. */
  last?: boolean
  onPress?: () => void
  style?: StyleProp<ViewStyle>
}

/** Partie terminée : tuile de l'univers, titre, issue et score. */
export function MatchRow({ topic, category, sub, outcome, score, bot = false, last = false, onPress, style }: MatchRowProps) {
  const { colors, radius } = useTheme()
  const { label, color } = OUTCOMES[outcome]
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={[topic, bot ? 'contre le bot' : undefined, sub, label, score].filter(Boolean).join(', ')}
      disabled={!onPress}
      pressedScale={1}
      ripple
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 64,
          flexDirection: 'row',
          alignItems: 'center',
          gap: tokens.space[4],
          paddingHorizontal: tokens.space[5],
          paddingVertical: tokens.space[3],
          backgroundColor: pressed ? colors.hover : 'transparent',
        },
        style,
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radius.md,
          backgroundColor: tokens.category[category].color,
        }}
      >
        <CategoryIcon category={category} size={22} weight="fill" color={colors.onAccent} style={{ opacity: 0.8 }} />
        {bot && (
          <View
            style={{
              position: 'absolute',
              right: -4,
              bottom: -4,
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.full,
              borderWidth: 2,
              borderColor: colors.surface,
              backgroundColor: colors.raised,
            }}
          >
            <RobotIcon size={12} color={colors.muted} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text variant="headline" numberOfLines={1}>
          {topic}
        </Text>
        {sub && (
          <Text variant="caption" color="muted" numberOfLines={1}>
            {sub}
          </Text>
        )}
      </View>
      <View style={{ alignItems: 'flex-end', gap: tokens.space[1] }}>
        <Text variant="caption" weight="600" color={color}>
          {label}
        </Text>
        <Text variant="callout" weight="600" mono>
          {score}
        </Text>
      </View>
      {!last && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: HAIRLINE, backgroundColor: colors.border }}
        />
      )}
    </PressableScale>
  )
}
