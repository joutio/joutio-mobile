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
  LoadMoreScrollView,
  MobileTopBar,
  Podium,
  PlayerRow,
  Screen,
  Skeleton,
  SlidersHorizontalIcon,
  Text,
  tokens,
  TrophyIcon,
  useTheme,
  WarningCircleIcon,
} from '@/design-system'
import { useMe } from '@/features/me'
import { countryLabel } from '@/shared/utils/country'
import { tierOf } from '@/shared/utils/tier'
import type { LeaderboardEntryView } from '@/shared/types/bff'
import { useTopicLeaderboardPage } from '../hooks/use-topic'
import { formatNumber, monthlyLegend } from '../lib/format'
import { DEFAULT_RANKING_FILTERS, type RankingFilterState } from '../lib/topic-service'
import { boardSub, MyBoardRow } from './board-tab'
import { RankingsFiltersSheet } from './rankings-filters-sheet'
import { userAvatar } from '@/shared/utils/avatar'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'
import { useRefreshActive } from '@/shared/hooks/use-refresh-active'

const GUTTER = tokens.space[5]
const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long' })

export interface RankingsRouteParams {
  topicId: string
  topicName?: string
  backLabel?: string
  [key: string]: string | undefined
}

function Loading() {
  return (
    <View style={{ flex: 1, gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
      <Skeleton shape="card" />
      <Skeleton shape="row" />
      <Skeleton shape="row" />
      <Skeleton shape="row" />
    </View>
  )
}

/** Page complète des classements d'un sujet (`classements.md`) : podium, pagination de 20, filtres période/portée. */
export function RankingsScreen() {
  const params = useLocalSearchParams<RankingsRouteParams>()
  const topicId = params.topicId
  const me = useMe(true)
  const { colors, radius } = useTheme()
  const [filterState, setFilterState] = useState<RankingFilterState>(DEFAULT_RANKING_FILTERS)
  const [sheetOpen, setSheetOpen] = useState(false)
  const listRef = useRef<FlashListRef<LeaderboardEntryView>>(null)
  const month = useMemo(() => new Date().toISOString().slice(0, 7), [])

  const filters = useMemo(() => ({ ...filterState, month }), [filterState, month])
  const list = useTopicLeaderboardPage(topicId, filters, Boolean(topicId))
  const pageRefresh = useRefreshActive()
  const active = filterState.period !== DEFAULT_RANKING_FILTERS.period || filterState.scope !== DEFAULT_RANKING_FILTERS.scope
  const hasCountry = Boolean(me.data?.country)

  const entries = useMemo(() => {
    const seen = new Set<string>()
    return (list.data?.pages.flatMap((page) => page.entries.content) ?? []).filter((entry) => {
      if (seen.has(entry.userId)) return false
      seen.add(entry.userId)
      return true
    })
  }, [list.data])
  const meEntry = list.data?.pages[0]?.me ?? null
  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)
  const showMeBar = Boolean(meEntry && !entries.some((entry) => entry.userId === meEntry.userId))
  const scoreOf = (entry: LeaderboardEntryView) => (filterState.period === 'MONTHLY' ? entry.monthlyXp : entry.totalXp)
  const scopeLabel = filterState.scope === 'WORLD' ? 'Mondial' : filterState.scope === 'FOLLOWING' ? 'Suivis' : countryLabel(me.data?.country)
  const legend =
    filterState.period === 'MONTHLY' && filterState.scope === 'WORLD'
      ? monthlyLegend()
      : filterState.period === 'MONTHLY'
        ? `XP gagnée en ${MONTH.format(new Date())} · ${scopeLabel} · remise à zéro le 1er du mois`
        : `XP cumulée · ${scopeLabel}`
  const reset = () => setFilterState(DEFAULT_RANKING_FILTERS)
  const change = (patch: Partial<RankingFilterState>) => setFilterState((current) => ({ ...current, ...patch }))

  // Un filtre change la première page : on revient en haut pendant que l'ancienne liste reste affichée.
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [filters])

  return (
    <Screen
      scroll={false}
      header={
        <MobileTopBar
          variant="inline"
          back={params.backLabel ?? 'Sujet'}
          onBack={() => router.back()}
          title="Tous les classements"
          subtitle={params.topicName}
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
        <RankingsFiltersSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          filters={filterState}
          onChange={change}
          onReset={reset}
          hasCountry={hasCountry}
        />
      }
      bottomBar={
        showMeBar && meEntry ? (
          <MyBoardRow
            entry={meEntry}
            sub={filterState.period === 'MONTHLY' ? `${formatNumber(meEntry.monthlyXp)} XP ce mois` : `${formatNumber(meEntry.totalXp)} XP au total`}
            trail={formatNumber(scoreOf(meEntry))}
          />
        ) : undefined
      }
      contentStyle={{ flex: 1 }}
    >
      {list.isPending && !list.data ? (
        <Loading />
      ) : list.isError && !list.data ? (
        <View style={{ flex: 1, justifyContent: 'center', padding: GUTTER }}>
          <EmptyState
            icon={WarningCircleIcon}
            title="Impossible de charger le classement"
            description="Vérifie ta connexion, puis réessaie."
            action={
              <Button style={{ alignSelf: 'center' }} loading={list.isRefetching} onPress={() => void list.refetch()}>
                Réessayer
              </Button>
            }
          />
        </View>
      ) : entries.length === 0 ? (
        <View style={{ flex: 1, justifyContent: 'center', gap: tokens.space[4], padding: GUTTER }}>
          <Text variant="caption" color="muted" align="center">
            {legend}
          </Text>
          <EmptyState icon={TrophyIcon} title="Aucun classement pour cette période" description="Les filtres restent la sortie." />
        </View>
      ) : (
        <DragToLoadMore
          enabled={Boolean(list.hasNextPage) && !list.isFetchNextPageError}
          loading={list.isFetchingNextPage}
          onLoadMore={() => list.fetchNextPage()}
        >
          <FlashList
            refreshing={pageRefresh.refreshing}
            onRefresh={pageRefresh.onRefresh}
            ref={listRef}
            renderScrollComponent={LoadMoreScrollView}
            maintainVisibleContentPosition={{ disabled: true }}
            style={{ flex: 1 }}
            data={rest}
            keyExtractor={(entry) => entry.userId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
            ListHeaderComponent={
              <View style={{ gap: tokens.space[4], paddingHorizontal: GUTTER, paddingBottom: tokens.space[3] }}>
                <Text variant="caption" color="muted">
                  {legend}
                </Text>
                {podium.length > 0 && (
                  <Podium
                    players={podium.map((entry) => ({
                      name: entry.pseudonym,
                      src: userAvatar(entry),
                      tier: entry.provisional ? undefined : tierOf(entry.rating),
                      value: formatNumber(scoreOf(entry)),
                    }))}
                  />
                )}
              </View>
            }
            ListFooterComponent={
              <FeedFooter style={{ marginHorizontal: GUTTER }} {...feedFooterProps(pagedQuery(list))} endLabel="Tu as vu tout le classement" />
            }
            renderItem={({ item: entry, index }) => {
              const first = index === 0
              const last = index === rest.length - 1
              return (
                <View
                  style={{
                    marginHorizontal: GUTTER,
                    backgroundColor: colors.surface,
                    borderTopLeftRadius: first ? radius.lg : 0,
                    borderTopRightRadius: first ? radius.lg : 0,
                    borderBottomLeftRadius: last ? radius.lg : 0,
                    borderBottomRightRadius: last ? radius.lg : 0,
                    overflow: 'hidden',
                  }}
                >
                  <PlayerRow
                    rank={entry.rank}
                    name={entry.pseudonym}
                    src={userAvatar(entry)}
                    tier={entry.provisional ? undefined : tierOf(entry.rating)}
                    sub={boardSub(entry)}
                    trail={formatNumber(scoreOf(entry))}
                    highlight={entry.userId === meEntry?.userId}
                    last={last}
                  />
                </View>
              )
            }}
          />
        </DragToLoadMore>
      )}
    </Screen>
  )
}
