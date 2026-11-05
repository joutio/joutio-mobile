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
  toast,
  toCategoryCode,
  tokens,
  WarningCircleIcon,
  type MatchOutcome,
} from '@/design-system'
import type { GameHistoryItemView, GameOutcome } from '@/shared/types/bff'
import { useTopicGames } from '../hooks/use-topic'
import { dayLabel, formatNumber } from '../lib/format'

const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }

const subOf = (game: GameHistoryItemView) => {
  if (game.opponentType === 'BOT') return 'entraînement'
  if (game.xp === null) return undefined
  return `${game.xp >= 0 ? '+' : '−'}${formatNumber(Math.abs(game.xp))} XP`
}

/** Onglet Parties : mes 10 dernières parties du sujet, groupées par jour. */
export function GamesTab({ topicId }: { topicId: string }) {
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
          <Button
            variant="plain"
            size="S"
            // Historique complet : lot 8 du kit.
            onPress={() => toast.info('Bientôt disponible', { description: "L'historique complet arrive avec le Profil." })}
          >
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
                  sub={subOf(game)}
                  outcome={OUTCOMES[game.outcome] ?? 'draw'}
                  score={`${game.myScore} · ${game.opponentScore}`}
                  bot={game.opponentType === 'BOT'}
                  last={index === group.games.length - 1}
                />
              ))}
            </ListGroup>
          </View>
        ))
      )}
    </TabScrollView>
  )
}
