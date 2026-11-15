import { router } from '@/shared/navigation/router'
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import {
  DragToLoadMore,
  LoadMoreScrollView,
  Button,
  CrownSimpleIcon,
  EmptyState,
  FeedFooter,
  IconButton,
  ListGroup,
  ListRow,
  MagnifyingGlassIcon,
  MobileSheet,
  MobileTopBar,
  RadioGroup,
  Screen,
  SearchField,
  SectionHeader,
  Skeleton,
  SlidersHorizontalIcon,
  Text,
  TitleRow,
  tokens,
  useGuardedRefresh,
  WarningCircleIcon,
  tabBarScrollInsets,
  useTabBarInset,
} from '@/design-system'
import { useMyTitles, useWearTitle } from '@/features/topic/hooks/use-topic'
import { tierLabel } from '@/features/topic/lib/format'
import type { MasteryTier, TitleView } from '@joutio/client/api-types'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'
import { topicName } from '@/shared/utils/topic-name'
import { titleLabel } from '../lib/format'
import { t, useT } from '@/lib/i18n'

const GUTTER = tokens.space[5]
const PAGE_SIZE = 5
const TIERS: MasteryTier[] = ['DIAMANT', 'EMERAUDE', 'PLATINE', 'OR', 'ARGENT', 'BRONZE', 'FER']
interface Group {
  topicId: string
  topic: string
  titles: TitleView[]
}

type Sort = 'RECENT' | 'OLDEST' | 'ALPHA'
const SORTS: readonly { value: Sort; label: 'titles.sortRecent' | 'titles.sortOldest' | 'titles.sortAlpha' }[] = [
  { value: 'RECENT', label: 'titles.sortRecent' },
  { value: 'OLDEST', label: 'titles.sortOldest' },
  { value: 'ALPHA', label: 'titles.sortAlpha' },
]

const countLabel = (count: number) => t(count > 1 ? 'titles.countMany' : 'titles.countOne', { count })

/**
 * Groupes par sujet, titres du palier le plus haut au plus bas. Les sujets suivent leur dernier déblocage
 * (`unlockedAt`) : décroissant (« Plus récents »), croissant (« Plus anciens ») ou par nom (« Alphabétique »).
 */
function groupsOf(titles: readonly TitleView[], tier: MasteryTier | undefined, query: string, sort: Sort): Group[] {
  const search = query.trim().toLowerCase()
  const groups = new Map<string, Group>()
  const recentFirst = [...titles].sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt))
  for (const title of recentFirst) {
    if (tier && title.tier !== tier) continue
    const topic = topicName(title.topic.names)
    if (search && !`${titleLabel(title)} ${topic}`.toLowerCase().includes(search)) continue
    const group = groups.get(title.topicId) ?? { topicId: title.topicId, topic, titles: [] }
    group.titles.push(title)
    groups.set(title.topicId, group)
  }
  const list = [...groups.values()].map((group) => ({ ...group, titles: group.titles.sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier)) }))
  if (sort === 'OLDEST') list.reverse()
  if (sort === 'ALPHA') list.sort((a, b) => a.topic.localeCompare(b.topic))
  return list
}

/** Tous les titres (`titres.md`) : recherche, filtre par rang et tri ; liste groupée par sujet, 5 sujets par page. */
export function TitlesScreen() {
  const t = useT()
  // Fin de liste au-dessus de la tab bar native iOS (`useTabBarInset`).
  const tabInset = useTabBarInset()
  const titles = useMyTitles()
  const wear = useWearTitle()
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState<MasteryTier>()
  const [sort, setSort] = useState<Sort>('RECENT')
  const [pages, setPages] = useState(1)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const all = titles.data?.titles ?? []
  const groups = useMemo(() => groupsOf(all, tier, query, sort), [all, tier, query, sort])
  const count = groups.reduce((sum, group) => sum + group.titles.length, 0)
  const shown = groups.slice(0, pages * PAGE_SIZE)
  const source = clientSource(pages, setPages, shown.length < groups.length)
  const { refreshing, refresh } = useGuardedRefresh(() => titles.refetch())
  const filtered = tier !== undefined || sort !== 'RECENT'
  const hasTitles = all.length > 0
  const change = (next: () => void) => {
    next()
    setPages(1)
  }
  const reset = () =>
    change(() => {
      setTier(undefined)
      setSort('RECENT')
    })

  const header = (
    <View>
      <MobileTopBar variant="inline" back={t('nav.profile')} onBack={() => router.back()} title={t('titles.title')} />
      {hasTitles && !titles.isError && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: tokens.space[3],
            paddingHorizontal: GUTTER,
            paddingTop: tokens.space[2],
            paddingBottom: tokens.space[3],
          }}
        >
          <View style={{ flex: 1 }}>
            <SearchField
              value={query}
              onChange={(next) => change(() => setQuery(next))}
              placeholder={t('titles.search')}
              label={t('titles.search')}
            />
          </View>
          <IconButton
            icon={SlidersHorizontalIcon}
            label={t('titles.filter')}
            variant="gray"
            tone="neutral"
            badge={filtered ? 'dot' : undefined}
            onPress={() => setFiltersOpen(true)}
          />
        </View>
      )}
    </View>
  )

  const empty = () => {
    if (titles.isPending)
      return (
        <View style={{ gap: tokens.space[3] }}>
          <Skeleton shape="row" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </View>
      )
    if (titles.isError)
      return (
        <EmptyState
          icon={WarningCircleIcon}
          title={t('profile.titlesError')}
          description={t('home.errorText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={titles.isRefetching} onPress={() => void titles.refetch()}>
              {t('callback.retry')}
            </Button>
          }
        />
      )
    if (!hasTitles)
      return <EmptyState icon={CrownSimpleIcon} title={t('profile.noTitlesTitle')} description={t('profile.noTitlesText')} />
    if (query.trim())
      return (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title={t('titles.noMatch')}
          action={
            <Button variant="gray" tone="neutral" style={{ alignSelf: 'center' }} onPress={() => change(() => setQuery(''))}>
              {t('titles.clearSearch')}
            </Button>
          }
        />
      )
    return (
      <EmptyState
        icon={CrownSimpleIcon}
        title={t('titles.noRank')}
        action={
          <Button variant="gray" tone="neutral" style={{ alignSelf: 'center' }} onPress={reset}>
            {t('topics.reset')}
          </Button>
        }
      />
    )
  }

  return (
    <Screen
      inTabs
      scroll={false}
      header={header}
      overlay={
        <MobileSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title={t('titles.filter')}
          action={
            <Button variant="plain" size="S" onPress={reset}>
              {t('topics.reset')}
            </Button>
          }
          footer={
            <Button full onPress={() => setFiltersOpen(false)}>
              {t('titles.show', { count: countLabel(count) })}
            </Button>
          }
        >
          <View style={{ gap: tokens.space[6] }}>
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title={t('titles.sort')} />
              <RadioGroup label={t('titles.sort')}>
                <ListGroup>
                  {SORTS.map((option, index) => (
                    <ListRow
                      key={option.value}
                      label={t(option.label)}
                      control="radio"
                      on={sort === option.value}
                      onToggle={() => change(() => setSort(option.value))}
                      last={index === SORTS.length - 1}
                    />
                  ))}
                </ListGroup>
              </RadioGroup>
            </View>
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title={t('titles.rank')} />
              <RadioGroup label={t('titles.rank')}>
                <ListGroup>
                  {[undefined, ...[...TIERS].reverse()].map((item, index) => (
                    <ListRow
                      key={item ?? 'all'}
                      label={item ? tierLabel(item) : t('titles.allRanks')}
                      control="radio"
                      on={tier === item}
                      onToggle={() => change(() => setTier(item))}
                      last={index === TIERS.length}
                    />
                  ))}
                </ListGroup>
              </RadioGroup>
            </View>
          </View>
        </MobileSheet>
      }
    >
      <DragToLoadMore {...loadMoreOptions(source)}>
        <FlatList
          data={shown}
          renderScrollComponent={(props) => <LoadMoreScrollView {...props} />}
          refreshing={refreshing}
          onRefresh={refresh}
          keyExtractor={(group) => group.topicId}
          {...tabBarScrollInsets(tabInset)}
          contentContainerStyle={{
            flexGrow: 1,
            gap: tokens.space[5],
            paddingHorizontal: GUTTER,
            paddingTop: tokens.space[2],
            paddingBottom: tokens.space[7],
          }}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[3] }}>
              <Text variant="callout" color="muted">
                {countLabel(count)}
              </Text>
            </View>
          }
          ListEmptyComponent={empty()}
          renderItem={({ item }) => (
            <View style={{ gap: tokens.space[3] }}>
              <Text variant="caption" weight="600" color="muted">
                {item.topic}
              </Text>
              <ListGroup surface="surface">
                {item.titles.map((title, index) => (
                  <TitleRow
                    key={title.key}
                    tier={title.tier}
                    title={titleLabel(title)}
                    worn={titles.data?.equippedKey === title.key}
                    wearing={wear.isPending && wear.variables === title.key}
                    disabled={wear.isPending}
                    onWear={() => wear.mutate(titles.data?.equippedKey === title.key ? null : title.key)}
                    last={index === item.titles.length - 1}
                  />
                ))}
              </ListGroup>
            </View>
          )}
          ListFooterComponent={
            shown.length > 0 ? (
              <FeedFooter {...feedFooterProps(source)} endLabel={t('titles.end')} remainingLabel={t('mobile.profile.otherTopics', { count: groups.length - shown.length })} />
            ) : undefined
          }
        />
      </DragToLoadMore>
    </Screen>
  )
}
