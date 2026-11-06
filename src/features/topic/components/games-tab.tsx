import { router } from 'expo-router'
import { View } from 'react-native'
import {
  Button,
  EmptyState,
  ListGroup,
  MatchRow,
  SectionHeader,
  Skeleton,
  SwordIcon,
  TabScrollView,
  Text,
  toCategoryCode,
  tokens,
  WarningCircleIcon,
  type MatchOutcome,
} from '@/design-system'
import type { GameHistoryItemView, GameOutcome } from '@/shared/types/bff'
import { topicName as formatTopicName } from '@/shared/utils/topic-name'
import { useTopicGames } from '../hooks/use-topic'
import { dayLabel, formatNumber } from '../lib/format'

const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }

const subOf = (game: GameHistoryItemView) => {
  if (game.opponentType === 'BOT') return 'entraînement'
  if (game.xp === null) return undefined
  return `${game.xp >= 0 ? '+' : '−'}${formatNumber(Math.abs(game.xp))} XP`
}

/** Onglet Parties : mes 10 dernières parties du sujet, groupées par jour. */
export function GamesTab({
  topicId,
  topicName,
  historyPath,
}: {
  topicId: string
  topicName: string
  historyPath: '/home/history' | '/topics/history' | '/profile/history'
}) {
  const games = useTopicGames(topicId)
  // Parties terminées seulement : une partie en attente ou annulée n'a pas d'issue à montrer.
  const finished = (games.data?.content ?? []).filter((game) => OUTCOMES[game.outcome])
  const groups: { day: string; games: GameHistoryItemView[] }[] = []
  for (const game of finished) {
    const day = dayLabel(new Date(game.playedAt))
    const last = groups[groups.length - 1]
    if (last?.day === day) last.games.push(game)
    else groups.push({ day, games: [game] })
  }

  return (
    <TabScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ gap: tokens.space[5], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}
    >
      <SectionHeader
        title="Dernières parties"
        action={
          <Button variant="plain" size="S" onPress={() => router.push({ pathname: historyPath, params: { topicId, topicName, backLabel: 'Sujet' } })}>
            Tout voir
          </Button>
        }
      />
      {games.isPending ? (
        <>
          <Skeleton shape="row" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </>
      ) : games.isError && !games.data ? (
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger tes parties"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={games.isRefetching} onPress={() => void games.refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState icon={SwordIcon} title="Aucune partie dans ce sujet" description="Lance un duel : tes parties apparaîtront ici." />
      ) : (
        groups.map((group) => (
          <View key={group.day} style={{ gap: tokens.space[3] }}>
            <Text variant="caption" weight="600" color="muted">
              {group.day}
            </Text>
            <ListGroup surface="surface">
              {group.games.map((game, index) => (
                <MatchRow
                  key={game.gameId}
                  topic={game.opponent?.pseudonym ?? (game.opponentType === 'BOT' ? 'Robot' : 'Adversaire')}
                  category={toCategoryCode(game.topic.category)}
                  image={game.topic.imageUrl ?? undefined}
                  sub={subOf(game)}
                  outcome={OUTCOMES[game.outcome] ?? 'draw'}
                  score={`${game.myScore} · ${game.opponentScore}`}
                  bot={game.opponentType === 'BOT'}
                  last={index === group.games.length - 1}
                  onPress={() =>
                    router.push({
                      pathname: '/result/[gameId]',
                      params: {
                        gameId: game.gameId,
                        topicName: formatTopicName(game.topic.names),
                        topicId: game.topic.topicId,
                        category: game.topic.category ?? '',
                      },
                    })
                  }
                />
              ))}
            </ListGroup>
          </View>
        ))
      )}
    </TabScrollView>
  )
}
