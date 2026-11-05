import { View, type StyleProp, type ViewStyle } from 'react-native'
import { RoundDots, type RoundResult } from '../duel/round-dots'
import { LightningIcon } from '../icons'
import { Avatar } from '../primitives/avatar'
import type { MatchOutcome } from '../primitives/match-row'
import { Text } from '../primitives/text'
import { useTheme, type ThemeColors } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'

type Tone = keyof ThemeColors
const OUTCOMES: Record<MatchOutcome, { label: string; tone: Tone; me: Tone; opponent: Tone }> = {
  win: { label: 'Victoire', tone: 'accentInk', me: 'correct', opponent: 'wrong' },
  loss: { label: 'Défaite', tone: 'text', me: 'wrong', opponent: 'correct' },
  draw: { label: 'Égalité', tone: 'text', me: 'text', opponent: 'text' },
  forfeit: { label: 'Abandon', tone: 'muted', me: 'muted', opponent: 'muted' },
}

export interface ResultPlayer {
  name: string
  src?: string
  tier?: TierCode
  score: number
  /** Résultat de chaque manche. */
  streak: readonly RoundResult[]
  /** Sous le nom, par exemple `Elo 856 · non classé`. */
  meta?: string
}

export interface ResultHeaderProps {
  outcome: MatchOutcome
  topic: string
  me: ResultPlayer
  opponent: ResultPlayer
  style?: StyleProp<ViewStyle>
}

function PlayerName({ player }: { player: ResultPlayer }) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.space[2] }}>
      <Text variant="headline" numberOfLines={1}>
        {player.name}
      </Text>
      {player.meta && (
        <Text variant="caption" color="muted" numberOfLines={1}>
          {player.meta}
        </Text>
      )}
      <RoundDots results={player.streak} size={10} style={{ marginTop: tokens.space[2] }} />
    </View>
  )
}

/**
 * Issue, sujet, avatars, scores et manches de chaque joueur. Les scores réservent la place de 3 chiffres, calés
 * contre leur avatar ; leur taille suit la colonne centrale (48 pt au plus).
 */
export function ResultHeader({ outcome, topic, me, opponent, style }: ResultHeaderProps) {
  const { colors } = useTheme()
  const tones = OUTCOMES[outcome]
  return (
    <View style={[{ alignSelf: 'stretch', gap: tokens.space[5] }, style]}>
      <View style={{ alignItems: 'center', gap: tokens.space[2] }}>
        <Text variant="hero" color={tones.tone} accessibilityRole="header">
          {tones.label}
        </Text>
        <Text variant="callout" color="muted">
          {topic}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] }}>
        <Avatar name={me.name} src={me.src} tier={me.tier} size="xl" decorative />
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Score : ${me.score} à ${opponent.score}`}
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}
        >
          <Text variant="numericLarge" color={tones.me} adjustsFontSizeToFit numberOfLines={1} style={{ flex: 1, textAlign: 'left' }}>
            {me.score}
          </Text>
          <LightningIcon size={24} weight="fill" color={colors.accentInk} />
          <Text variant="numericLarge" color={tones.opponent} adjustsFontSizeToFit numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
            {opponent.score}
          </Text>
        </View>
        <Avatar name={opponent.name} src={opponent.src} tier={opponent.tier} size="xl" decorative />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] }}>
        <PlayerName player={me} />
        <Text variant="caption" weight="600" color="muted" style={{ paddingTop: tokens.space[2] }}>
          vs
        </Text>
        <PlayerName player={opponent} />
      </View>
    </View>
  )
}
