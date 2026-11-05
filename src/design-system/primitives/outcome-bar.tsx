import { View, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '../theme/theme-provider'
import { tokens } from '../tokens.generated'
import { Text } from './text'

export interface OutcomeBarProps {
  wins: number
  draws: number
  losses: number
  style?: StyleProp<ViewStyle>
}

/** Marge d'un libellé au bord et écart entre deux centres de libellés, en % de la largeur. */
const LABEL_EDGE = 10
const LABEL_GAP = 21
const LABEL_WIDTH = 84

/** Centre chaque libellé sous sa part, puis l'écarte juste assez pour éviter le chevauchement (algorithme du lab). */
function labelPositions(shares: readonly number[]) {
  let start = 0
  const positions = shares.map((share) => {
    const center = start + share / 2
    start += share
    return Math.max(center, LABEL_EDGE)
  })
  for (let index = 1; index < positions.length; index += 1) {
    positions[index] = Math.max(positions[index] ?? 0, (positions[index - 1] ?? 0) + LABEL_GAP)
  }
  positions[positions.length - 1] = Math.min(positions[positions.length - 1] ?? 0, 100 - LABEL_EDGE)
  for (let index = positions.length - 2; index >= 0; index -= 1) {
    positions[index] = Math.min(positions[index] ?? 0, (positions[index + 1] ?? 0) - LABEL_GAP)
  }
  return positions
}

/**
 * Répartition des issues d'un face-à-face (`OutcomeBar` du lab) : barre proportionnelle, puis libellés et
 * pourcentages. Les issues à 0 % ne sont pas affichées, et la couleur ne porte jamais seule l'information.
 */
export function OutcomeBar({ wins, draws, losses, style }: OutcomeBarProps) {
  const { colors, radius } = useTheme()
  const total = wins + draws + losses
  const percent = (value: number) => (total > 0 ? Math.round((value * 100) / total) : 0)
  const parts = [
    { key: 'wins', label: 'Victoires', value: wins, color: colors.correct },
    { key: 'draws', label: 'Nuls', value: draws, color: colors.accent },
    { key: 'losses', label: 'Défaites', value: losses, color: colors.wrong },
  ].filter((part) => percent(part.value) > 0)
  if (total === 0 || parts.length === 0) return null

  const summary = parts.map((part) => `${part.label} ${percent(part.value)} %`).join(', ')
  const positions = labelPositions(parts.map((part) => (part.value * 100) / total))
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} style={[{ gap: tokens.space[2] }, style]}>
      <View style={{ height: 8, flexDirection: 'row', gap: tokens.space[1], overflow: 'hidden', borderRadius: radius.xs, backgroundColor: colors.raised }}>
        {parts.map((part) => (
          <View key={part.key} style={{ flex: part.value, backgroundColor: part.color }} />
        ))}
      </View>
      <View style={{ height: 34 }}>
        {parts.map((part, index) => (
          <View
            key={part.key}
            style={{
              position: 'absolute',
              left: `${positions[index] ?? 0}%`,
              width: LABEL_WIDTH,
              transform: [{ translateX: -LABEL_WIDTH / 2 }],
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Text variant="caption" color="muted" numberOfLines={1}>
              {part.label}
            </Text>
            <Text variant="headline" mono color={part.color} numberOfLines={1}>
              {`${percent(part.value)} %`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
