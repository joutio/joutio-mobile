import { useUnreadCount } from '@/features/home/hooks/use-home'
import { NotificationButton } from '@/features/notifications/components/notification-button'
import { useScrollToTop } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { RefreshControl, ScrollView, useWindowDimensions, View } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'
import {
  ArrowsDownUpIcon,
  Button,
  Chip,
  DragToLoadMore,
  EmptyState,
  EyeSlashIcon,
  FeedFooter,
  useGuardedRefresh,
  ListGroup,
  ListRow,
  LoadMoreScrollView,
  MagnifyingGlassIcon,
  MobileSheet,
  RadioGroup,
  ScrollToTopPill,
  Screen,
  SearchHeader,
  SectionHeader,
  Skeleton,
  Text,
  TOPIC_TILE_TITLE_HEIGHT,
  TOPIC_TILE_VISUAL,
  TopicTile,
  tokens,
  toCategoryCode,
  useTheme,
  WarningCircleIcon,
  type CategoryCode,
} from '@/design-system'
import { openTopic } from '@/features/topic'
import { DEFAULT_TOPIC_SORT, pageSizeFor } from '../lib/topics-service'
import { useDebounced } from '@/shared/hooks/use-debounced'
import type { TopicCardView, TopicSort } from '@joutio/client-domain/api-types'
import { topicName } from '@/shared/utils/topic-name'
import { useTopicFacets, useTopics } from '../hooks/use-topics'
import { useOnline } from '@/shared/hooks/use-online'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'

const GUTTER = tokens.space[5]
/** Écarts de la grille : 12 px entre colonnes, 16 px entre rangées. */
const GAP_X = tokens.space[4]
const GAP_Y = tokens.space[5]
/** Largeur minimale d'une colonne : 3 colonnes sur téléphone, 5 sur l'iPhone Duo ouvert. */
const MIN_COLUMN = 96
const columnsFor = (width: number) => Math.max(1, Math.floor((width - GUTTER * 2 + GAP_X) / (MIN_COLUMN + GAP_X)))
const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]
const SORTS: { value: TopicSort; label: string }[] = [
  { value: 'POPULAR', label: 'Les plus suivis' },
  { value: 'MOST_PLAYED', label: 'Les plus joués' },
  { value: 'RECENT', label: 'Nouveautés' },
]
const DEFAULT_SORT: TopicSort = DEFAULT_TOPIC_SORT

const countLabel = (count: number) => `${count} ${count > 1 ? 'sujets' : 'sujet'}`
const toggle = (list: readonly CategoryCode[], category: CategoryCode) =>
  list.includes(category) ? list.filter((item) => item !== category) : [...list, category]

/** Neuf pictogrammes et titres en squelette, sur la grille des tuiles. */
function Loading({ animated = true, columns, tile }: { animated?: boolean; columns: number; tile: number }) {
  return (
    <View
      accessible
      accessibilityLabel="Chargement"
      style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: GAP_X, rowGap: GAP_Y, paddingHorizontal: GUTTER }}
    >
      {Array.from({ length: Math.max(9, columns) }, (_, index) => (
        <View key={index} style={{ width: tile, alignItems: 'center', gap: tokens.space[3] }}>
          <Skeleton shape="card" animated={animated} style={{ width: TOPIC_TILE_VISUAL, height: TOPIC_TILE_VISUAL }} />
          <View style={{ alignSelf: 'stretch', gap: tokens.space[2], height: TOPIC_TILE_TITLE_HEIGHT, alignItems: 'center' }}>
            <Skeleton animated={animated} width="90%" />
            <Skeleton animated={animated} width="60%" />
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Sujets (`design/specs/screens/sujets.md`) : en-tête de recherche animé avec les composants Joutio ;
 * puces d'univers, compteur et tri ; grille adaptative de `TopicTile` (colonnes d'au moins 96 px), pages en rangées
 * pleines (environ 20 sujets). Toucher Sujets remonte en haut.
 */
export function TopicsScreen() {
  const unread = useUnreadCount()
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  // Autant de colonnes que la largeur en permet (pliable ouvert compris) ; la place restante va aux colonnes.
  const columns = columnsFor(width)
  const tile = (width - GUTTER * 2 - GAP_X * (columns - 1)) / columns
  const cell = width / columns
  const list = useRef<FlashListRef<TopicCardView>>(null)
  useScrollToTop(list)

  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<CategoryCode[]>([])
  const [sort, setSort] = useState<TopicSort>(DEFAULT_SORT)
  const [hideFollowed, setHideFollowed] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const offset = useSharedValue(0)

  const search = useDebounced(query.trim())
  const size = pageSizeFor(columns)
  const filters = useMemo(() => ({ query: search, categories, sort, hideFollowed, size }), [search, categories, sort, hideFollowed, size])
  const topics = useTopics(filters)
  const online = useOnline()
  const facets = useTopicFacets(search)

  // Un changement de recherche, de filtre ou de tri ramène au seuil de collage (ici, le haut de la grille) : tout de
  // suite, puis à l'arrivée des nouveaux résultats (l'ancienne page reste affichée en attendant, `keepPreviousData`).
  const backToTop = useRef(false)
  useEffect(() => {
    backToTop.current = true
    list.current?.scrollToOffset({ offset: 0, animated: false })
  }, [filters])
  useEffect(() => {
    if (!backToTop.current || topics.isPlaceholderData || topics.isPending) return
    backToTop.current = false
    list.current?.scrollToOffset({ offset: 0, animated: false })
  }, [topics.data, topics.isPlaceholderData, topics.isPending])

  // Un tri à égalité (abonnés, parties) peut renvoyer un même sujet sur deux pages : une seule carte par sujet.
  const items = useMemo(
    () => [...new Map((topics.data?.pages.flatMap((page) => page.topics) ?? []).map((topic) => [topic.topicId, topic])).values()],
    [topics.data],
  )
  // Compteur : effectifs des facettes, qui ne connaissent pas « Masquer les sujets suivis » (`sujets.md` § 5).
  const count = facets.data
    ? categories.length === 0
      ? facets.data.total
      : facets.data.categories.filter((facet) => categories.includes(toCategoryCode(facet.category))).reduce((sum, facet) => sum + facet.count, 0)
    : items.length
  // Les codes inconnus des tokens retombent tous sur `GENERAL` : une puce par univers.
  const quick = facets.data ? [...new Set(facets.data.categories.filter((facet) => facet.count > 0).map((facet) => toCategoryCode(facet.category)))] : []
  const reset = () => {
    setCategories([])
    setSort(DEFAULT_SORT)
    setHideFollowed(false)
  }
  // Tiré vers le bas en haut de la grille : catalogue, univers et cloche se rechargent.
  const { refreshing, refresh } = useGuardedRefresh(() => Promise.all([topics.refetch(), facets.refetch(), unread.refetch()]))

  // Ce qui reste à charger : connu par les facettes, qui ignorent « Masquer les sujets suivis » (alors rien).
  const remaining = facets.data && !hideFollowed ? count - items.length : 0
  const remainingLabel = remaining > 0 ? `${remaining} ${remaining > 1 ? 'autres sujets' : 'autre sujet'}` : undefined
  const sortLabel = SORTS.find((option) => option.value === sort)?.label ?? ''

  const listHeader = (
    <View style={{ gap: tokens.space[3], paddingBottom: tokens.space[4] }}>
      <ScrollView
        horizontal
        scrollsToTop={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: tokens.space[3] }}
      >
        <Chip selected={categories.length === 0} onPress={() => setCategories([])}>
          Tous
        </Chip>
        {quick.map((category) => (
          <Chip key={category} selected={categories.includes(category)} onPress={() => setCategories(toggle(categories, category))}>
            {tokens.category[category].label}
          </Chip>
        ))}
      </ScrollView>
      {/* Hors connexion (`etats-systeme.md`) : la bannière remplace le compteur et le tri, squelettes fixes dessous. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[3], paddingHorizontal: GUTTER }}>
        <Text variant="callout" color="muted">
          {online ? countLabel(topics.isError ? 0 : count) : ' '}
        </Text>
        <Chip icon={ArrowsDownUpIcon} onPress={() => setSheetOpen(true)}>
          {sortLabel}
        </Chip>
      </View>
    </View>
  )

  const emptyState =
    topics.isPending || !online ? (
      <Loading animated={online} columns={columns} tile={tile} />
    ) : topics.isError ? (
      <EmptyState
        icon={WarningCircleIcon}
        title="Impossible de charger les sujets"
        description="Vérifie ta connexion, puis réessaie."
        action={
          <Button style={{ alignSelf: 'center' }} loading={topics.isRefetching} onPress={() => void topics.refetch()}>
            Réessayer
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={MagnifyingGlassIcon}
        title="Aucun sujet trouvé"
        description="Essaie un autre mot ou retire des filtres."
        action={
          <Button
            style={{ alignSelf: 'center' }}
            onPress={() => {
              reset()
              setQuery('')
            }}
          >
            Réinitialiser
          </Button>
        }
      />
    )

  return (
    <Screen
      scrollOffset={offset}
      inTabs
      scroll={false}
      header={
        <SearchHeader
          title="Sujets"
          value={query}
          onChange={setQuery}
          placeholder="Chercher un sujet"
          onFilter={() => setSheetOpen(true)}
          filterDot={categories.length > 0 || sort !== DEFAULT_SORT || hideFollowed}
          notifications={<NotificationButton />}
        />
      }
      overlay={
        <MobileSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Filtres"
          action={
            <Button variant="plain" size="S" onPress={reset}>
              Réinitialiser
            </Button>
          }
          footer={
            <Button full onPress={() => setSheetOpen(false)}>
              {`Afficher ${countLabel(count)}`}
            </Button>
          }
        >
          <View style={{ gap: tokens.space[6] }}>
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title="Univers" />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] }}>
                {UNIVERSES.map((category) => (
                  <Chip key={category} selected={categories.includes(category)} onPress={() => setCategories(toggle(categories, category))}>
                    {tokens.category[category].label}
                  </Chip>
                ))}
              </View>
            </View>
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title="Trier par" />
              <ListGroup>
                <RadioGroup label="Trier par">
                  {SORTS.map((option, index) => (
                    <ListRow
                      key={option.value}
                      label={option.label}
                      control="radio"
                      on={sort === option.value}
                      onToggle={() => setSort(option.value)}
                      last={index === SORTS.length - 1}
                    />
                  ))}
                </RadioGroup>
              </ListGroup>
            </View>
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader title="Affichage" />
              <ListGroup>
                <ListRow icon={EyeSlashIcon} label="Masquer les sujets suivis" control="toggle" on={hideFollowed} onToggle={setHideFollowed} last />
              </ListGroup>
            </View>
          </View>
        </MobileSheet>
      }
    >
      <View style={{ flex: 1 }}>
        {/* Suite : traction en bas de la grille (`DragToLoadMore`), loader sous la liste. */}
        <DragToLoadMore
          enabled={Boolean(topics.hasNextPage) && !topics.isFetchNextPageError}
          loading={topics.isFetchingNextPage}
          onLoadMore={() => topics.fetchNextPage()}
        >
          <FlashList
            key={columns}
            ref={list}
            renderScrollComponent={LoadMoreScrollView}
            // Activé par défaut en v2 : à un nouveau tri, il garderait en vue le sujet affiché avant, au lieu du haut.
            maintainVisibleContentPosition={{ disabled: true }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={refresh}
                tintColor={colors.muted}
                colors={[colors.accent]}
                progressBackgroundColor={colors.surface}
              />
            }
            style={{ flex: 1, backgroundColor: colors.bg }}
            data={items}
            keyExtractor={(topic) => topic.topicId}
            numColumns={columns}
            contentContainerStyle={{ paddingTop: tokens.space[3], paddingBottom: tokens.space[7] }}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              offset.value = event.nativeEvent.contentOffset.y
            }}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyState}
            renderItem={({ item, index }) => {
              // Cellules de largeur égale (`width / columns`) : le décalage place chaque tuile sur la grille gouttière + écarts.
              const left = GUTTER + (index % columns) * (tile + GAP_X - cell)
              return (
                <View style={{ paddingLeft: left, paddingBottom: GAP_Y }}>
                  <TopicTile
                    style={{ width: tile }}
                    title={topicName(item.names)}
                    category={toCategoryCode(item.category)}
                    pictogram={item.pictogramUrl ?? undefined}
                    image={item.imageUrl ?? item.bannerUrl ?? undefined}
                    onPress={() => openTopic('topics', item)}
                  />
                </View>
              )
            }}
            ListFooterComponent={
              items.length > 0 ? (
                <FeedFooter
                  style={{ marginHorizontal: GUTTER }}
                  {...feedFooterProps(pagedQuery(topics))}
                  endLabel="Tu as vu tous les sujets"
                  remainingLabel={remainingLabel}
                />
              ) : undefined
            }
          />
        </DragToLoadMore>
        <ScrollToTopPill scroll={offset} onPress={() => list.current?.scrollToOffset({ offset: 0, animated: true })} />
      </View>
    </Screen>
  )
}
