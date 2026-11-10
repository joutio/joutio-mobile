import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { FlatList, View } from 'react-native'
import {
  ArrowsDownUpIcon,
  Chip,
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
} from '@/design-system'
import { useMyTitles, useWearTitle } from '@/features/topic/hooks/use-topic'
import { tierLabel } from '@/features/topic/lib/format'
import type { MasteryTier, TitleView } from '@/shared/types/bff'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'
import { topicName } from '@/shared/utils/topic-name'
import { titleLabel } from '../lib/format'

const GUTTER = tokens.space[5]
const PAGE_SIZE = 5
const TIERS: MasteryTier[] = ['DIAMANT', 'EMERAUDE', 'PLATINE', 'OR', 'ARGENT', 'BRONZE', 'FER']
type Sort = 'RECENT' | 'OLDEST' | 'ALPHA'
const SORTS: { value: Sort; label: string }[] = [
  { value: 'RECENT', label: 'Plus récents' },
  { value: 'OLDEST', label: 'Plus anciens' },
  { value: 'ALPHA', label: 'Alphabétique' },
]

interface Group {
  topicId: string
  topic: string
  titles: TitleView[]
}

const countLabel = (count: number) => `${count} titre${count > 1 ? 's' : ''}`

/**
 * Groupes par sujet, du palier le plus haut au plus bas. Sans `unlockedAt` côté BFF (`titres.md` § 6), « Plus
 * récents » suit l'ordre du serveur et « Plus anciens » l'inverse.
 */
function groupsOf(titles: readonly TitleView[], tier: MasteryTier | undefined, query: string, sort: Sort): Group[] {
  const search = query.trim().toLowerCase()
  const groups = new Map<string, Group>()
  for (const title of titles) {
    if (tier && title.tier !== tier) continue
    const topic = topicName(title.topic.names)
    if (search && !`${titleLabel(title)} ${topic}`.toLowerCase().includes(search)) continue
    const group = groups.get(title.topicId) ?? { topicId: title.topicId, topic, titles: [] }
    group.titles.push(title)
    groups.set(title.topicId, group)
  }
  const list = [...groups.values()].map((group) => ({ ...group, titles: group.titles.sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier)) }))
  if (sort === 'OLDEST') list.reverse()
  if (sort === 'ALPHA') list.sort((a, b) => a.topic.localeCompare(b.topic, 'fr'))
  return list
}

/** Tous les titres (`titres.md`) : recherche, filtre par rang et tri ; liste groupée par sujet, 5 sujets par page. */
export function TitlesScreen() {
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
      <MobileTopBar variant="inline" back="Profil" onBack={() => router.back()} title="Tous les titres" />
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
              placeholder="Chercher un titre ou un sujet"
              label="Chercher un titre ou un sujet"
            />
          </View>
          <IconButton
            icon={SlidersHorizontalIcon}
            label="Filtrer"
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
          title="Impossible de charger tes titres"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={titles.isRefetching} onPress={() => void titles.refetch()}>
              Réessayer
            </Button>
          }
        />
      )
    if (!hasTitles)
      return <EmptyState icon={CrownSimpleIcon} title="Aucun titre pour l'instant" description="Progresse dans un sujet pour décrocher ton premier titre." />
    if (query.trim())
      return (
        <EmptyState
          icon={MagnifyingGlassIcon}
          title="Aucun titre trouvé"
          action={
            <Button variant="gray" tone="neutral" style={{ alignSelf: 'center' }} onPress={() => change(() => setQuery(''))}>
              Effacer la recherche
            </Button>
          }
        />
      )
    return (
      <EmptyState
        icon={CrownSimpleIcon}
        title="Aucun titre pour ce rang"
        action={
          <Button variant="gray" tone="neutral" style={{ alignSelf: 'center' }} onPress={reset}>
            Réinitialiser
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
          title="Filtrer"
          action={
            <Button variant="plain" size="S" onPress={reset}>
              Réinitialiser
            </Button>
          }
          footer={
            <Button full onPress={() => setFiltersOpen(false)}>
              {`Afficher ${countLabel(count)}`}
            </Button>
          }
        >
          <View style={{ gap: tokens.space[6] }}>
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title="Rang" />
              <RadioGroup label="Rang">
                <ListGroup>
                  {[undefined, ...[...TIERS].reverse()].map((item, index) => (
                    <ListRow
                      key={item ?? 'all'}
                      label={item ? tierLabel(item) : 'Tous les rangs'}
                      control="radio"
                      on={tier === item}
                      onToggle={() => change(() => setTier(item))}
                      last={index === TIERS.length}
                    />
                  ))}
                </ListGroup>
              </RadioGroup>
            </View>
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title="Tri" />
              <RadioGroup label="Tri">
                <ListGroup>
                  {SORTS.map((item, index) => (
                    <ListRow
                      key={item.value}
                      label={item.label}
                      control="radio"
                      on={sort === item.value}
                      onToggle={() => change(() => setSort(item.value))}
                      last={index === SORTS.length - 1}
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
          contentContainerStyle={{ flexGrow: 1, gap: tokens.space[5], paddingHorizontal: GUTTER, paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}
          ListHeaderComponent={
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[3] }}>
              <Text variant="callout" color="muted">{countLabel(count)}</Text>
              <Chip icon={ArrowsDownUpIcon} onPress={() => setFiltersOpen(true)}>
                {SORTS.find((option) => option.value === sort)?.label ?? ''}
              </Chip>
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
              <FeedFooter {...feedFooterProps(source)} endLabel="Tu as vu tous tes titres" remainingLabel={`${groups.length - shown.length} autres sujets`} />
            ) : undefined
          }
        />
      </DragToLoadMore>
    </Screen>
  )
}
