import { router } from 'expo-router'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Banner, Button, ForceDark, RobotIcon, Skeleton, Stat, Text, tokens, useTheme } from '@/design-system'
import { useMe } from '@/features/me'
import { useBotDifficulty, useStartTraining } from '@/features/play/hooks/use-play'
import { resultOutcome, type GameState } from '../domain/game'
import { useGameResult } from '../hooks/use-game'

const TITLES = { win: 'Victoire', loss: 'Défaite', draw: 'Égalité' } as const
const signed = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value)}`

/**
 * Fin de duel **provisoire** (lot 6) : issue, scores, XP et Elo. L'écran Résultat complet (déblocages, maîtrise, revue
 * des manches) arrive au lot 7 (`resultat.md`).
 */
export function DuelResult({
  gameId,
  game,
  topic,
  topicId,
  category,
}: {
  gameId: string
  game: GameState
  topic: string
  topicId?: string
  category?: string
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const cancelled = game.status === 'CANCELED'
  const result = useGameResult(gameId, !cancelled)
  const training = useStartTraining()
  const difficulty = useBotDifficulty((state) => state.difficulty)
  const data = result.data
  const outcome = resultOutcome(data?.winnerId ?? game.winnerId, userId)
  const forfeited = game.forfeiterId !== null
  const bot = data?.botGame ?? game.player2Type === 'BOT'
  const myScore = data?.myScore ?? (game.player1Id === userId ? game.player1Score : game.player2Score)
  const theirScore = data?.opponentScore ?? (game.player1Id === userId ? game.player2Score : game.player1Score)

  return (
    <ForceDark>
      <View
        style={{
          flex: 1,
          gap: tokens.space[6],
          paddingHorizontal: tokens.space[5],
          paddingTop: insets.top + tokens.space[8],
          paddingBottom: insets.bottom + tokens.space[5],
          backgroundColor: colors.bg,
        }}
      >
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: tokens.space[4] }}>
          <Text variant="caption" weight="600" color="muted">
            {topic}
          </Text>
          <Text
            variant="largeTitle"
            color={cancelled ? 'text' : outcome === 'win' ? 'correct' : outcome === 'loss' ? 'wrong' : 'text'}
            accessibilityRole="header"
          >
            {cancelled ? 'Partie annulée' : TITLES[outcome]}
          </Text>
          {!cancelled && (
            <Text variant="numericLarge" accessibilityLabel={`${myScore} à ${theirScore}`}>
              {myScore} · {theirScore}
            </Text>
          )}
          {forfeited && !cancelled && (
            <Text variant="callout" color="muted" align="center">
              {game.forfeiterId === userId ? 'Tu as abandonné le duel.' : 'Ton adversaire a abandonné.'}
            </Text>
          )}
        </View>
        {!cancelled &&
          (bot ? (
            <Banner tone="training" title="Entraînement" message="Partie sans XP ni Elo. Défie un joueur pour progresser." />
          ) : !data ? (
            <Skeleton shape="card" />
          ) : (
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <Stat label="XP gagnée" value={data.reward ? `+${data.reward.xp + data.reward.victoryBonus}` : '…'} tone="accent" compact />
              <Stat
                label="Elo"
                value={data.rated && data.eloDelta !== undefined ? signed(data.eloDelta) : '—'}
                tone={(data.eloDelta ?? 0) >= 0 ? 'up' : 'down'}
                compact
              />
              <Stat label="Bonnes réponses" value={`${data.correctAnswers} / ${data.totalRounds}`} compact />
            </View>
          ))}
        <View style={{ gap: tokens.space[3] }}>
          {bot && topicId && (
            <Button
              full
              size="L"
              icon={RobotIcon}
              loading={training.isPending}
              onPress={() => {
                // Remplace le duel terminé : le retour ramène toujours au sujet.
                router.back()
                training.mutate({ topic: { topicId, name: topic, category }, difficulty })
              }}
            >
              Rejouer
            </Button>
          )}
          <Button full size="L" variant={bot ? 'gray' : 'filled'} tone={bot ? 'neutral' : 'accent'} onPress={() => router.back()}>
            Retour au sujet
          </Button>
        </View>
      </View>
    </ForceDark>
  )
}
