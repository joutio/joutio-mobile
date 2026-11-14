import { useState } from 'react'
import { View, type StyleProp, type ViewStyle } from 'react-native'
import { RoundDots, type RoundResult } from '../duel/round-dots'
import { LightningIcon } from '../icons'
import { Avatar } from '../primitives/avatar'
import { PlayerLink, PlayerName } from '../primitives/player-name'
import type { MatchOutcome } from '../primitives/match-row'
import { Text } from '../primitives/text'
import { useTheme, type ThemeColors } from '../theme/theme-provider'
import { tokens, type TierCode } from '../tokens.generated'

/** Éclair 24 pt et deux gaps de 8 pt entre les scores (`.jo-result-score` du lab : `(100cqw − 40px) / 3.6`). */
const SCORE_CHROME = 40
/** Largeur de deux scores à 3 chiffres, en fois la taille de police : 6 × 0,6 em. */
const SCORE_EM = 3.6

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
  /** `PremiumBadge` après le pseudonyme. */
  premium?: boolean
  /** Avatar et pseudonyme ouvrent la fiche du joueur. */
  onOpen?: () => void
}

export interface ResultHeaderProps {
  outcome: MatchOutcome
  topic: string
  me: ResultPlayer
  opponent: ResultPlayer
  style?: StyleProp<ViewStyle>
}

function PlayerLabel({ player }: { player: ResultPlayer }) {
  return (
    <View style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: tokens.space[2] }}>
      <PlayerLink onOpen={player.onOpen} name={player.name} style={{ maxWidth: '100%' }}>
        <PlayerName name={player.name} premium={player.premium} justify="center" />
      </PlayerLink>
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
  const [center, setCenter] = useState(0)
  // Une seule taille pour les deux scores, comme `.jo-result-score` du lab : `min(48px, (colonne − 40px) / 3.6)`
  // (éclair 24 pt + deux gaps de 8 pt, deux scores de 3 chiffres à 0,6 em). Avant la mesure : la taille du token.
  const max = tokens.typography.numericLarge.fontSize
  const size = center > 0 ? Math.min(max, (center - SCORE_CHROME) / SCORE_EM) : max
  const scoreStyle = { fontSize: size, lineHeight: size }
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
        <PlayerLink onOpen={me.onOpen} name={me.name}>
          <Avatar name={me.name} src={me.src} tier={me.tier} size="xl" decorative />
        </PlayerLink>
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Score : ${me.score} à ${opponent.score}`}
          onLayout={(event) => setCenter(event.nativeEvent.layout.width)}
          style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] }}
        >
          {/* La mise en page réserve 3 chiffres : le texte ne grossit pas avec Dynamic Type, il déborderait. */}
          <Text variant="numericLarge" color={tones.me} maxFontSizeMultiplier={1} numberOfLines={1} style={[scoreStyle, { flex: 1, textAlign: 'left' }]}>
            {me.score}
          </Text>
          <LightningIcon size={24} weight="fill" color={colors.accentInk} />
          <Text variant="numericLarge" color={tones.opponent} maxFontSizeMultiplier={1} numberOfLines={1} style={[scoreStyle, { flex: 1, textAlign: 'right' }]}>
            {opponent.score}
          </Text>
        </View>
        <PlayerLink onOpen={opponent.onOpen} name={opponent.name}>
          <Avatar name={opponent.name} src={opponent.src} tier={opponent.tier} size="xl" decorative />
        </PlayerLink>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] }}>
        <PlayerLabel player={me} />
        <Text variant="caption" weight="600" color="muted" style={{ paddingTop: tokens.space[2] }}>
          vs
        </Text>
        <PlayerLabel player={opponent} />
      </View>
    </View>
  )
}
