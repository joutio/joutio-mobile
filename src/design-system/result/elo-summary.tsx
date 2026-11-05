import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '../primitives/text'
import { tokens } from '../tokens.generated'

export interface EloSummaryProps {
  elo: number
  /** Variation de la partie. */
  delta: number
  /** Objectif suivant, par exemple `Platine à 1 000 · encore 144`. */
  next?: string
  style?: StyleProp<ViewStyle>
}

/** Elo en héros, delta de la partie, prochain rang. */
export function EloSummary({ elo, delta, next, style }: EloSummaryProps) {
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  return (
    <View
      accessible
      accessibilityLabel={`Elo ${elo}, ${delta >= 0 ? 'plus' : 'moins'} ${Math.abs(delta)}${next ? `, ${next}` : ''}`}
      style={[{ alignItems: 'center', gap: tokens.space[2] }, style]}
    >
      <Text variant="callout" weight="600" color="muted">
        Elo
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[4] }}>
        <Text variant="numericHero">{elo}</Text>
        <Text variant="numericMedium" color={delta > 0 ? 'correct' : delta < 0 ? 'wrong' : 'muted'}>{`${sign}${Math.abs(delta)}`}</Text>
      </View>
      {next && (
        <Text variant="callout" color="muted">
          {next}
        </Text>
      )}
    </View>
  )
}
