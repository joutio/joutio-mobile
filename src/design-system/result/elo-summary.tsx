import { View, type StyleProp, type ViewStyle } from 'react-native'
import { Text } from '../primitives/text'
import { tokens } from '../tokens.generated'
import { useT } from '@/lib/i18n'

export interface EloSummaryProps {
  elo: number
  /** Variation de la partie. */
  delta: number
  /** Objectif suivant, par exemple `Platine à 1 000 · encore 144`. */
  next?: string
  /** Écran court : Elo en `numericLarge` au lieu de `numericHero`, à côté de la maîtrise. */
  compact?: boolean
  style?: StyleProp<ViewStyle>
}

/** Elo en héros, delta de la partie, prochain rang. */
export function EloSummary({ elo, delta, next, compact = false, style }: EloSummaryProps) {
  const t = useT()
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : ''
  return (
    <View
      accessible
      accessibilityLabel={t('ds.eloA11y', { elo, sign: t(delta >= 0 ? 'ds.plus' : 'ds.minus'), delta: Math.abs(delta), next: next ? `, ${next}` : '' })}
      style={[{ alignItems: 'center', gap: tokens.space[2] }, style]}
    >
      <Text variant="callout" weight="600" color="muted">
        {t('social.sortElo')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[4] }}>
        <Text variant={compact ? 'numericLarge' : 'numericHero'}>{elo}</Text>
        <Text variant="numericMedium" color={delta > 0 ? 'correct' : delta < 0 ? 'wrong' : 'muted'}>{`${sign}${Math.abs(delta)}`}</Text>
      </View>
      {next && (
        <Text variant="callout" color="muted" align="center">
          {next}
        </Text>
      )}
    </View>
  )
}
