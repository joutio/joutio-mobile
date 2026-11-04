import { useScrollToTop } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, ScrollView, useWindowDimensions, View } from 'react-native'
import {
  ArrowsDownUpIcon,
  BellIcon,
  Button,
  Chip,
  EmptyState,
  EyeSlashIcon,
  FeedFooter,
  IconButton,
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
  StickyBar,
  Text,
  TopicCard,
  tokens,
  toCategoryCode,
  usePullToLoadMore,
  useTheme,
  WarningCircleIcon,
  type CategoryCode,
} from '@/design-system'
import { useUnreadCount } from '@/features/home'
import type { TopicCardView, TopicSort } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import { useTopicFacets, useTopics } from '../hooks/use-topics'

const GUTTER = tokens.space[5]
const GAP = tokens.space[4]
const UNIVERSES = Object.keys(tokens.category) as CategoryCode[]
const SORTS: { value: TopicSort; label: string }[] = [
  { value: 'POPULAR', label: 'Les plus suivis' },
  { value: 'MOST_PLAYED', label: 'Les plus joués' },
  { value: 'RECENT', label: 'Nouveautés' },
]
const DEFAULT_SORT: TopicSort = 'POPULAR'

const countLabel = (count: number) => `${count} ${count > 1 ? 'sujets' : 'sujet'}`
const toggle = (list: readonly CategoryCode[], category: CategoryCode) =>
  list.includes(category) ? list.filter((item) => item !== category) : [...list, category]

/** Saisie stabilisée : la recherche part 300 ms après la dernière frappe. */
function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function Loading() {
  return (
    <View accessible accessibilityLabel="Chargement" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GUTTER }}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={{ flexBasis: '45%', flexGrow: 1 }}>
          <Skeleton shape="card" style={{ aspectRatio: 3 / 4, height: undefined }} />
        </View>
      ))}
    </View>
  )
}

/**
 * Sujets (`design/specs/screens/sujets.md`) : barre « Sujets » et cloche fixes ; recherche et Filtres collés dessous ;
 * puces d'univers, compteur et tri ; grille de 2 colonnes, 20 sujets par page. Toucher Sujets remonte en haut.
 */
export function TopicsScreen() {
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  // Largeur fixe d'une colonne : une carte seule sur sa ligne ne s'étire pas sur toute la largeur.
  const cardWidth = (width - GUTTER * 2 - GAP) / 2
  const unread = useUnreadCount()
  const list = useRef<FlatList<TopicCardView>>(null)
  useScrollToTop(list)

  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<CategoryCode[]>([])
  const [sort, setSort] = useState<TopicSort>(DEFAULT_SORT)
  const [hideFollowed, setHideFollowed] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const search = useDebounced(query.trim())
  const filters = useMemo(() => ({ query: search, categories, sort, hideFollowed }), [search, categories, sort, hideFollowed])
  const topics = useTopics(filters)
  const facets = useTopicFacets(search)

  // Un changement de recherche ou de filtre ramène au seuil de collage (ici, le haut de la grille).
  useEffect(() => {
    list.current?.scrollToOffset({ offset: 0, animated: false })
  }, [filters])

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
  // Suite : pull-to-refresh inversé en bas de la grille.
  const pullUp = usePullToLoadMore({
    enabled: Boolean(topics.hasNextPage) && !topics.isFetchingNextPage && !topics.isFetchNextPageError,
    onLoadMore: () => void topics.fetchNextPage(),
  })
  const sortLabel = SORTS.find((option) => option.value === sort)?.label ?? ''

  const listHeader = (
    <View style={{ gap: tokens.space[3], paddingBottom: tokens.space[4] }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: tokens.space[3] }}>
        <Chip selected={categories.length === 0} onPress={() => setCategories([])}>
          Tous
        </Chip>
        {quick.map((category) => (
          <Chip key={category} selected={categories.includes(category)} onPress={() => setCategories(toggle(categories, category))}>
            {tokens.category[category].label}
          </Chip>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[3], paddingHorizontal: GUTTER }}>
        <Text variant="callout" color="muted">
          {countLabel(topics.isError ? 0 : count)}
        </Text>
        <Chip icon={ArrowsDownUpIcon} onPress={() => setSheetOpen(true)}>
          {sortLabel}
        </Chip>
      </View>
    </View>
  )

  const emptyState = topics.isPending ? (
    <Loading />
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
      inTabs
      scroll={false}
      header={
        <MobileTopBar
          title="Sujets"
          right={<IconButton icon={BellIcon} label="Notifications" variant="plain" tone="neutral" badge={unread.data?.count ? 'dot' : undefined} />}
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
            </View>
            <ListRow icon={EyeSlashIcon} label="Masquer les sujets suivis" control="toggle" on={hideFollowed} onToggle={setHideFollowed} last />
          </View>
        </MobileSheet>
      }
    >
      <StickyBar
        stuck={scrolled}
        style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingHorizontal: GUTTER, paddingVertical: tokens.space[3] }}
      >
        <View style={{ flex: 1 }}>
          <SearchField value={query} onChange={setQuery} onCancel={() => setQuery('')} placeholder="Chercher un sujet" label="Chercher un sujet" />
        </View>
        <IconButton
          icon={SlidersHorizontalIcon}
          label="Filtres"
          variant="gray"
          tone="neutral"
          badge={categories.length || undefined}
          onPress={() => setSheetOpen(true)}
        />
      </StickyBar>
      <FlatList
        ref={list}
        {...pullUp.scrollProps}
        style={{ flex: 1, backgroundColor: colors.bg }}
        data={items}
        keyExtractor={(topic) => topic.topicId}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP, paddingHorizontal: GUTTER }}
        contentContainerStyle={{ gap: GAP, paddingTop: tokens.space[3], paddingBottom: tokens.space[7], flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        onScroll={(event) => {
          setScrolled(event.nativeEvent.contentOffset.y > 0)
          pullUp.scrollProps.onScroll(event)
        }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={emptyState}
        renderItem={({ item }) => (
          <View style={{ width: cardWidth }}>
            <TopicCard title={topicName(item.names)} category={toCategoryCode(item.category)} image={item.imageUrl ?? undefined} orientation="portrait" />
          </View>
        )}
        ListFooterComponent={
          items.length > 0 ? (
            <FeedFooter
              style={{ marginHorizontal: GUTTER }}
              state={topics.isFetchingNextPage ? 'loading' : topics.isFetchNextPageError ? 'error' : topics.hasNextPage ? 'more' : 'end'}
              onLoadMore={() => void topics.fetchNextPage()}
              onRetry={() => void topics.fetchNextPage()}
              endLabel="Tu as vu tous les sujets"
              pull={pullUp.pull}
            />
          ) : undefined
        }
      />
    </Screen>
  )
}
