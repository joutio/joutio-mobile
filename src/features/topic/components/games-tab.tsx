import { router } from '@/shared/navigation/router'
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
import type { GameHistoryItemView } from '@joutio/client/profile'
import type { GameOutcome } from '@joutio/client/game'
import { topicName as formatTopicName } from '@/shared/utils/topic-name'
import { useTopicGames } from '../hooks/use-topic'
import { dayLabel, formatNumber } from '../lib/format'
import { t, useT } from '@/lib/i18n'

const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }

const subOf = (game: GameHistoryItemView) => {
  if (game.opponentType === 'BOT') return t('topic.training')
  if (game.xp === null) return undefined
  return t('common.xpSigned', { sign: game.xp >= 0 ? '+' : '−', xp: formatNumber(Math.abs(game.xp)) })
}

/** Onglet Parties : mes 10 dernières parties du sujet, groupées par jour. */
export function GamesTab({
  topicId,
  topicName,
  historyPath,
}: {
  topicId: string
  topicName: string
  historyPath: '/home/history' | '/topics/history' | '/profile/history' | '/social/history'
}) {
  const t = useT()
  const games = useTopicGames(topicId)
  // Parties terminées seulement : une partie en attente ou annulée n'a pas d'issue à montrer.
  const finished = (games.games ?? []).filter((game) => OUTCOMES[game.outcome])
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
        title={t('topic.lastGames')}
        action={
          <Button
            variant="plain"
            size="S"
            onPress={() => router.push({ pathname: historyPath, params: { topicId, topicName, backLabel: t('pending.topic') } })}
          >
            {t('home.seeAll')}
          </Button>
        }
      />
      {games.isPending ? (
        <>
          <Skeleton shape="row" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </>
      ) : games.isError ? (
        <EmptyState
          icon={WarningCircleIcon}
          title={t('topic.gamesError')}
          description={t('home.errorText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={games.isRefetching} onPress={() => void games.refetch()}>
              {t('callback.retry')}
            </Button>
          }
        />
      ) : groups.length === 0 ? (
        <EmptyState icon={SwordIcon} title={t('topic.noGamesTitle')} description={t('topic.noGamesText')} />
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
                  topic={game.opponent?.pseudonym ?? (game.opponentType === 'BOT' ? t('topic.bot') : t('topic.opponent'))}
                  category={toCategoryCode(game.topic.category)}
                  pictogram={game.topic.pictogramUrl ?? undefined}
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
