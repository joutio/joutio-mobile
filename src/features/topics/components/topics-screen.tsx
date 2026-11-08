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
  haptic,
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
  TopicCard,
  tokens,
  toCategoryCode,
  useTheme,
  WarningCircleIcon,
  type CategoryCode,
} from '@/design-system'
import { openTopic } from '@/features/topic'
import { DEFAULT_TOPIC_SORT } from '../lib/topics-service'
import { useDebounced } from '@/shared/hooks/use-debounced'
import type { TopicCardView, TopicSort } from '@/shared/types/bff'
import { topicName } from '@/shared/utils/topic-name'
import { useTopicFacets, useTopics } from '../hooks/use-topics'
import { useOnline } from '@/shared/hooks/use-online'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'

const GUTTER = tokens.space[5]
const GAP = tokens.space[4]
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

function Loading({ animated = true }: { animated?: boolean }) {
  return (
    <View accessible accessibilityLabel="Chargement" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GUTTER }}>
      {[0, 1, 2, 3].map((index) => (
        <View key={index} style={{ flexBasis: '45%', flexGrow: 1 }}>
          <Skeleton shape="card" animated={animated} style={{ aspectRatio: 3 / 4, height: undefined }} />
        </View>
      ))}
    </View>
  )
}

/**
 * Sujets (`design/specs/screens/sujets.md`) : en-tête de recherche animé avec les composants Joutio ;
 * puces d'univers, compteur et tri ; grille de 2 colonnes, 20 sujets par page. Toucher Sujets remonte en haut.
 */
export function TopicsScreen() {
  const unread = useUnreadCount()
  const { colors } = useTheme()
  const { width } = useWindowDimensions()
  // Largeur fixe d'une colonne : une carte seule sur sa ligne ne s'étire pas sur toute la largeur.
  const cardWidth = (width - GUTTER * 2 - GAP) / 2
  const list = useRef<FlashListRef<TopicCardView>>(null)
  useScrollToTop(list)

  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<CategoryCode[]>([])
  const [sort, setSort] = useState<TopicSort>(DEFAULT_SORT)
  const [hideFollowed, setHideFollowed] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const offset = useSharedValue(0)

  const search = useDebounced(query.trim())
  const filters = useMemo(() => ({ query: search, categories, sort, hideFollowed }), [search, categories, sort, hideFollowed])
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
  const refreshBusy = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const refresh = () => {
    if (refreshBusy.current) return
    refreshBusy.current = true
    // Android ne remonte pas la traction : le retour haptique marque le déclenchement.
    haptic('light')
    setRefreshing(true)
    void Promise.all([topics.refetch(), facets.refetch(), unread.refetch()])
      .catch(() => undefined)
      .finally(() => {
        refreshBusy.current = false
        setRefreshing(false)
      })
  }

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
      <Loading animated={online} />
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
            numColumns={2}
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
              // Deux colonnes : gouttière dehors, demi-écart dedans ; la carte garde sa largeur fixe.
              const left = index % 2 === 0
              return (
                <View style={{ paddingLeft: left ? GUTTER : GAP / 2, paddingRight: left ? GAP / 2 : GUTTER, paddingBottom: GAP }}>
                  <View style={{ width: cardWidth }}>
                    <TopicCard
                      title={topicName(item.names)}
                      category={toCategoryCode(item.category)}
                      image={item.imageUrl ?? undefined}
                      orientation="portrait"
                      onPress={() => openTopic('topics', item)}
                    />
                  </View>
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
