import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  DragToLoadMore,
  EmptyState,
  FeedFooter,
  IconButton,
  ListGroup,
  LoadMoreScrollView,
  MatchRow,
  MobileTopBar,
  Screen,
  Skeleton,
  SlidersHorizontalIcon,
  SwordIcon,
  Text,
  toCategoryCode,
  tokens,
  WarningCircleIcon,
  type MatchOutcome,
} from '@/design-system'
import { dayLabel, formatNumber } from '@/features/topic/lib/format'
import { useMe } from '@/features/me'
import type { GameHistoryItemView, GameOutcome } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import { useHistoryGames } from '../hooks/use-history'
import { DEFAULT_HISTORY_FILTERS, type HistoryFilterState } from '../lib/history-service'
import { HistoryFiltersSheet } from './history-filters-sheet'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'

const GUTTER = tokens.space[5]
const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }

export interface HistoryRouteParams {
  userId?: string
  topicId?: string
  topicName?: string
  opponentId?: string
  opponentName?: string
  backLabel?: string
  [key: string]: string | undefined
}

const countLabel = (count: number) => `${formatNumber(count)} ${count > 1 ? 'parties' : 'partie'}`

function Loading() {
  return (
    <View style={{ flex: 1, gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
      <Skeleton width={120} />
      <Skeleton shape="row" />
      <Skeleton shape="row" />
      <Skeleton shape="row" />
      <Skeleton shape="row" />
    </View>
  )
}

type DayGroup = { day: string; games: GameHistoryItemView[] }

/** Historique complet (`historique.md`) : filtres type/résultat/tri, pagination de 20 parties, groupement par jour. */
export function HistoryScreen() {
  const params = useLocalSearchParams<HistoryRouteParams>()
  const me = useMe(true)
  const userId = params.userId ?? me.data?.userId ?? ''
  const [filterState, setFilterState] = useState<HistoryFilterState>(DEFAULT_HISTORY_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const listRef = useRef<FlashListRef<DayGroup>>(null)

  const filters = useMemo(() => ({ ...filterState, topicId: params.topicId, opponentId: params.opponentId }), [filterState, params.topicId, params.opponentId])
  const list = useHistoryGames(userId, filters, Boolean(userId))
  const active = filterState.opponentType !== undefined || filterState.outcome !== 'ALL' || filterState.sort !== 'RECENT'

  const games = useMemo(() => list.data?.pages.flatMap((page) => page.content).filter((game) => OUTCOMES[game.outcome]) ?? [], [list.data])
  const groups = useMemo(() => {
    const result: DayGroup[] = []
    for (const game of games) {
      const day = dayLabel(new Date(game.playedAt))
      const last = result[result.length - 1]
      if (last?.day === day) last.games.push(game)
      else result.push({ day, games: [game] })
    }
    return result
  }, [games])

  const count = list.data?.pages[0]?.totalElements ?? 0
  const reset = () => setFilterState(DEFAULT_HISTORY_FILTERS)
  const change = (patch: Partial<HistoryFilterState>) => setFilterState((current) => ({ ...current, ...patch }))

  // Un filtre change la première page : on revient en haut pendant que l'ancienne liste reste affichée.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [filters])

  const openResult = (game: GameHistoryItemView) =>
    router.push({
      pathname: '/result/[gameId]',
      params: {
        gameId: game.gameId,
        topicName: topicName(game.topic.names),
        topicId: game.topic.topicId,
        category: game.topic.category ?? '',
      },
    })

  const empty = !list.isPending && games.length === 0
  // Fiche joueur : le sous-titre est l'adversaire ; sinon on retombe sur le sujet de la première partie (deep link restauré).
  // Depuis le Profil (ni sujet ni adversaire) : toutes les parties, sans sous-titre.
  const subtitle = params.opponentId ? params.opponentName : params.topicId ? (params.topicName ?? games[0]?.topic.names.fr) : undefined
  const backLabel = params.backLabel ?? (params.opponentId ? 'Joueur' : 'Sujet')

  return (
    <Screen
      inTabs
      scroll={false}
      header={
        <MobileTopBar
          variant="inline"
          back={backLabel}
          onBack={() => router.back()}
          title="Toutes les parties"
          subtitle={subtitle}
          right={
            <IconButton
              icon={SlidersHorizontalIcon}
              label="Filtrer"
              variant="gray"
              tone="neutral"
              badge={active ? 'dot' : undefined}
              onPress={() => setSheetOpen(true)}
            />
          }
        />
      }
      overlay={
        <HistoryFiltersSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          filters={filterState}
          onChange={change}
          onReset={reset}
          hideType={Boolean(params.opponentId)}
          count={count}
        />
      }
      contentStyle={{ flex: 1 }}
    >
      {list.isPending ? (
        <Loading />
      ) : list.isError && !list.data ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: GUTTER }}>
          <EmptyState
            icon={WarningCircleIcon}
            title="Impossible de charger tes parties"
            description="Vérifie ta connexion, puis réessaie."
            action={
              <Button style={{ alignSelf: 'center' }} loading={list.isRefetching} onPress={() => void list.refetch()}>
                Réessayer
              </Button>
            }
          />
        </View>
      ) : empty ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: GUTTER }}>
          <EmptyState
            icon={SwordIcon}
            title="Aucune partie"
            description={active ? 'Aucune partie ne correspond à ces filtres.' : 'Lance un duel : tes parties apparaîtront ici.'}
            action={
              active ? (
                <Button style={{ alignSelf: 'center' }} onPress={reset}>
                  Réinitialiser
                </Button>
              ) : undefined
            }
          />
        </View>
      ) : (
        <DragToLoadMore
          enabled={Boolean(list.hasNextPage) && !list.isFetchNextPageError}
          loading={list.isFetchingNextPage}
          onLoadMore={() => void list.fetchNextPage()}
        >
          <FlashList
            ref={listRef}
            renderScrollComponent={LoadMoreScrollView}
            maintainVisibleContentPosition={{ disabled: true }}
            style={{ flex: 1 }}
            data={groups}
            keyExtractor={(group) => group.day}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
            ListHeaderComponent={
              <Text variant="caption" weight="600" color="muted" style={{ paddingHorizontal: GUTTER, paddingBottom: tokens.space[2] }}>
                {countLabel(count)}
              </Text>
            }
            ListFooterComponent={
              <FeedFooter style={{ marginHorizontal: GUTTER }} {...feedFooterProps(pagedQuery(list))} endLabel="Tu as vu toutes tes parties" />
            }
            renderItem={({ item: group }) => (
              <View style={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingBottom: tokens.space[4] }}>
                <Text variant="caption" weight="600" color="muted">
                  {group.day}
                </Text>
                <ListGroup surface="surface">
                  {group.games.map((game, index) => (
                    <MatchRow
                      key={game.gameId}
                      topic={topicName(game.topic.names)}
                      category={toCategoryCode(game.topic.category)}
                      image={game.topic.imageUrl ?? undefined}
                      sub={game.opponentType === 'BOT' ? 'Entraînement' : (game.opponent?.pseudonym ?? 'Adversaire')}
                      outcome={OUTCOMES[game.outcome] ?? 'draw'}
                      score={`${game.myScore} · ${game.opponentScore}`}
                      bot={game.opponentType === 'BOT'}
                      last={index === group.games.length - 1}
                      onPress={() => openResult(game)}
                    />
                  ))}
                </ListGroup>
              </View>
            )}
          />
        </DragToLoadMore>
      )}
    </Screen>
  )
}
