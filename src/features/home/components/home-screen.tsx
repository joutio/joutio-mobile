import { router, useScrollToTop } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, View } from 'react-native'
import Animated, { interpolate, useAnimatedStyle, useDerivedValue, useSharedValue } from 'react-native-reanimated'
import {
  BellIcon,
  Button,
  Chip,
  CompassIcon,
  EmptyState,
  FeedFooter,
  FireIcon,
  IconButton,
  Logo,
  MagnifyingGlassIcon,
  Pill,
  PremiumBadge,
  Rail,
  Badge,
  Screen,
  SectionHeader,
  Skeleton,
  DragToLoadMore,
  TabLoadMoreScrollView,
  TabsScrollView,
  Text,
  TopicCard,
  TopicRow,
  TopTen,
  TOP_TEN_CARD_WIDTH,
  tokens,
  toCategoryCode,
  useHorizontalGesture,
  useTheme,
  WarningCircleIcon,
  compactBarProgress,
  useReducedMotion,
  type CategoryCode,
  type CollapsibleTabsRef,
} from '@/design-system'
import { useMe } from '@/features/me'
import { useMyActivity } from '@/features/profile/hooks/use-profile'
import type { TopicCardView } from '@/shared/types/bff'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { openTopic } from '@/features/topic'
import { useTopicFacets, useTopics } from '@/features/topics/hooks/use-topics'
import type { TopicFilters } from '@/features/topics/lib/topics-service'
import { useHome, useUnreadCount } from '../hooks/use-home'
import { OfflineBanner } from '@/shared/components/offline-banner'

const LANDSCAPE_WIDTH = 240
const GUTTER = tokens.space[5]

const TABS = [
  { value: 'for-you', label: 'Pour toi' },
  { value: 'followed', label: 'Suivis' },
] as const

type Tab = (typeof TABS)[number]['value']

const imageOf = (topic: TopicCardView) => topic.imageUrl ?? undefined
const remainingFollowed = (count: number) => `${count} ${count > 1 ? 'autres sujets suivis' : 'autre sujet suivi'}`

/** Rail de cartes paysage avec « Tout voir ». */
function TopicRail({ title, topics, onSeeAll }: { title: string; topics: TopicCardView[]; onSeeAll: () => void }) {
  return (
    <View style={{ gap: tokens.space[4] }}>
      <SectionHeader
        title={title}
        style={{ paddingHorizontal: GUTTER }}
        action={
          <Button variant="plain" size="S" style={{ marginRight: -tokens.space[4] }} onPress={onSeeAll}>
            Tout voir
          </Button>
        }
      />
      <Rail itemWidth={LANDSCAPE_WIDTH} label={title}>
        {topics.map((topic) => (
          <TopicCard
            key={topic.topicId}
            title={topicName(topic.names)}
            category={toCategoryCode(topic.category)}
            image={imageOf(topic)}
            onPress={() => openTopic('home', topic)}
          />
        ))}
      </Rail>
    </View>
  )
}

function ForYou({ trending, fresh }: { trending: TopicCardView[]; fresh: TopicCardView[] }) {
  const seeAll = () => router.navigate('/topics')
  return (
    <>
      {trending.length > 0 && (
        <TopTen
          topics={trending.map((topic) => ({
            id: topic.topicId,
            title: topicName(topic.names),
            category: toCategoryCode(topic.category),
            image: imageOf(topic),
          }))}
          onSelect={(item) => {
            const topic = trending.find((candidate) => candidate.topicId === item.id)
            if (topic) openTopic('home', topic)
          }}
          onSeeAll={seeAll}
        />
      )}
      {fresh.length > 0 && <TopicRail title="Nouveaux thèmes" topics={fresh} onSeeAll={seeAll} />}
    </>
  )
}

/** Filtres de l'onglet Suivis : tous les sujets suivis, paginés côté serveur (`GET /api/topics?followed=true`). */
const followedFilters = (categories: readonly CategoryCode[]): TopicFilters => ({ query: '', categories, sort: 'ALPHA', hideFollowed: false, followed: true })

/**
 * Sujets suivis : puces d'univers à sélection multiple (« Tous » par défaut), 20 par page **côté serveur** (l'Accueil
 * n'en renvoie que 10). La page suivante arrive par traction en bas de l'onglet (`DragToLoadMore`) ou par le bouton.
 */
function Followed({ list, selected, onSelect }: { list: ReturnType<typeof useTopics>; selected: CategoryCode[]; onSelect: (next: CategoryCode[]) => void }) {
  const { colors, radius } = useTheme()
  // Les puces d'univers sont un rail horizontal : elles possèdent le geste comme le Top 10.
  const gesture = useHorizontalGesture()
  const facets = useTopicFacets('', true)
  const universes = (facets.data?.categories ?? []).filter((facet) => facet.count > 0).map((facet) => toCategoryCode(facet.category))
  const topics = list.data?.pages.flatMap((page) => page.topics) ?? []
  const total = facets.data
    ? selected.length === 0
      ? facets.data.total
      : facets.data.categories.filter((facet) => selected.includes(toCategoryCode(facet.category))).reduce((sum, facet) => sum + facet.count, 0)
    : undefined
  const toggle = (category: CategoryCode) => onSelect(selected.includes(category) ? selected.filter((item) => item !== category) : [...selected, category])

  return (
    <View style={{ gap: tokens.space[4] }}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        scrollsToTop={false}
        showsHorizontalScrollIndicator={false}
        onTouchStart={gesture?.claim}
        onTouchEnd={gesture?.release}
        onTouchCancel={gesture?.release}
        onScrollBeginDrag={gesture?.claim}
        onScrollEndDrag={gesture?.release}
        onMomentumScrollEnd={gesture?.release}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: tokens.space[3] }}
      >
        <Chip selected={selected.length === 0} onPress={() => onSelect([])}>
          Tous
        </Chip>
        {universes.map((category) => (
          <Chip key={category} selected={selected.includes(category)} onPress={() => toggle(category)}>
            {tokens.category[category].label}
          </Chip>
        ))}
      </ScrollView>
      {list.isPending ? (
        <View style={{ marginHorizontal: GUTTER, gap: tokens.space[3] }}>
          <Skeleton shape="row" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </View>
      ) : (
        <View style={{ marginHorizontal: GUTTER, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface }}>
          {topics.map((topic, index) => (
            <TopicRow
              key={topic.topicId}
              title={topicName(topic.names)}
              category={toCategoryCode(topic.category)}
              image={imageOf(topic)}
              onPress={() => openTopic('home', topic)}
              last={index === topics.length - 1}
            />
          ))}
        </View>
      )}
      {!list.isPending && (
        <FeedFooter
          style={{ marginHorizontal: GUTTER }}
          state={list.isFetchNextPageError ? 'error' : list.isFetchingNextPage ? 'loading' : list.hasNextPage ? 'more' : 'end'}
          onLoadMore={() => void list.fetchNextPage()}
          onRetry={() => void list.fetchNextPage()}
          endLabel="Tu as vu tous tes sujets suivis"
          remainingLabel={list.hasNextPage && total !== undefined ? remainingFollowed(Math.max(0, total - topics.length)) : undefined}
        />
      )}
    </View>
  )
}

const SKELETON_SECTIONS = [
  { width: TOP_TEN_CARD_WIDTH, height: 229 },
  { width: LANDSCAPE_WIDTH, height: undefined },
] as const

function Loading() {
  return (
    <View accessible accessibilityLabel="Chargement" style={{ gap: tokens.space[6] }}>
      {SKELETON_SECTIONS.map(({ width, height }, section) => (
        <View key={section} style={{ gap: tokens.space[4], paddingHorizontal: GUTTER }}>
          <Skeleton width={160} />
          <View style={{ flexDirection: 'row', gap: tokens.space[4], overflow: 'hidden' }}>
            <Skeleton shape="card" width={width} style={height ? { height } : undefined} />
            <Skeleton shape="card" width={width} style={height ? { height } : undefined} />
          </View>
        </View>
      ))}
    </View>
  )
}

/** Contenu d'un onglet selon l'état des données : chargement, erreur, vide, ou la page. */
function TabPage({ tab, home }: { tab: Tab; home: ReturnType<typeof useHome> }) {
  const followed = tab === 'followed'
  const data = home.data
  const [selected, setSelected] = useState<CategoryCode[]>([])
  const list = useTopics(followedFilters(selected), followed)
  const empty = data && (followed ? data.followedTopics.length === 0 : data.trendingTopics.length === 0 && data.newTopics.length === 0)
  return (
    <DragToLoadMore
      enabled={followed && Boolean(list.hasNextPage) && !list.isFetchNextPageError}
      loading={list.isFetchingNextPage}
      onLoadMore={() => void list.fetchNextPage()}
    >
      <TabLoadMoreScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: tokens.space[7], paddingTop: tokens.space[5], paddingBottom: tokens.space[7] }}
      >
        <OfflineBanner onRetry={() => void home.refetch()} style={{ marginHorizontal: tokens.space[5] }} />
        {home.isPending && <Loading />}
        {home.isError && (
          <EmptyState
            icon={WarningCircleIcon}
            title="Impossible de charger l'accueil"
            description="Vérifie ta connexion, puis réessaie."
            action={
              <Button style={{ alignSelf: 'center' }} loading={home.isRefetching} onPress={() => void home.refetch()}>
                Réessayer
              </Button>
            }
          />
        )}
        {empty && (
          <EmptyState
            icon={CompassIcon}
            title={followed ? 'Tu ne suis aucun sujet' : "Aucun sujet pour l'instant"}
            description={followed ? 'Suis des sujets pour les retrouver ici.' : 'Suis tes premiers sujets pour remplir ton accueil.'}
            action={
              <Button style={{ alignSelf: 'center' }} onPress={() => router.navigate('/topics')}>
                Explorer
              </Button>
            }
          />
        )}
        {data &&
          !empty &&
          (followed ? <Followed list={list} selected={selected} onSelect={setSelected} /> : <ForYou trending={data.trendingTopics} fresh={data.newTopics} />)}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )
}

/** Montée du logo et du bonjour dans la barre pendant le passage, en points. */
const BAR_SHIFT = 10

/**
 * Accueil (`design/specs/screens/accueil.md`) : barre fixe (logo, recherche, cloche), bonjour + rang + série qui se
 * replient, onglets « Pour toi » / « Suivis » collés dessous et balayables (`TabsScrollView`), comme un profil Twitter.
 * Pendant que le grand bonjour passe sous la barre, le logo monte en s'effaçant et « Bonjour X » monte à sa place,
 * au rythme du défilement (courbe `compactBarProgress`, mesurée). Toucher Accueil dans la bottom nav remonte en haut.
 */
export function HomeScreen() {
  const me = useMe()
  const activity = useMyActivity()
  const streak = activity.data?.currentStreak
  const home = useHome()
  const unread = useUnreadCount()
  const tabsRef = useRef<CollapsibleTabsRef>(null)
  useScrollToTop(tabsRef)

  const [tab, setTab] = useState<Tab>('for-you')
  const [stuck, setStuck] = useState(false)
  const reduced = useReducedMotion()

  // Passage du grand bonjour sous la barre : début = son haut dans l'en-tête, durée = sa hauteur. Mesurés.
  const scroll = useSharedValue(0)
  const titleStart = useSharedValue<number>(tokens.space[4])
  const titleLength = useSharedValue(32)
  const progress = useDerivedValue(() => compactBarProgress(scroll.value, titleStart.value, titleLength.value))
  const logoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.6], [1, 0], 'clamp'),
    transform: [{ translateY: reduced ? 0 : -BAR_SHIFT * progress.value }],
  }))
  const barGreetingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.3, 1], [0, 1], 'clamp'),
    transform: [{ translateY: reduced ? 0 : BAR_SHIFT * (1 - progress.value) }],
  }))

  const pseudonym = me.data?.pseudonym ?? ''
  const rating = me.data?.progression?.rating
  const tier = rating !== undefined ? tierOf(rating) : undefined
  const greeting = pseudonym ? `Bonjour ${pseudonym}` : 'Bonjour'
  const premium = me.data?.premium ?? false

  const header = (
    <View style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingLeft: GUTTER, paddingRight: tokens.space[3], gap: tokens.space[3] }}>
      <View style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center', overflow: 'hidden' }}>
        <Animated.View style={logoStyle} accessibilityElementsHidden={stuck} importantForAccessibility={stuck ? 'no-hide-descendants' : 'auto'}>
          <Logo variant="lockup" size={28} />
        </Animated.View>
        <Animated.View
          accessibilityElementsHidden={!stuck}
          importantForAccessibility={stuck ? 'auto' : 'no-hide-descendants'}
          style={[{ position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }, barGreetingStyle]}
        >
          <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
            {greeting}
          </Text>
          {premium && <PremiumBadge size={18} />}
        </Animated.View>
      </View>
      <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
        <IconButton icon={MagnifyingGlassIcon} label="Rechercher" variant="plain" tone="neutral" />
        <IconButton
          icon={BellIcon}
          label="Notifications"
          variant="plain"
          tone="neutral"
          badge={unread.data?.count || undefined}
          onPress={() => router.push('/home/notifications')}
        />
      </View>
    </View>
  )

  return (
    <Screen inTabs scroll={false} header={header}>
      <TabsScrollView
        tabsRef={tabsRef}
        label="Contenu de l'accueil"
        value={tab}
        onChange={setTab}
        scroll={scroll}
        onStuckChange={setStuck}
        // Tiré vers le bas : tout l'Accueil se recharge (rails, profil, cloche).
        onRefresh={() => Promise.all([home.refetch(), me.refetch(), unread.refetch()])}
        header={
          <View style={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[4], paddingBottom: tokens.space[3] }}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] }}
              onLayout={(event) => {
                titleStart.value = event.nativeEvent.layout.y
                titleLength.value = event.nativeEvent.layout.height
              }}
            >
              <Text variant="title2" style={{ flexShrink: 1 }}>
                {greeting}
              </Text>
              {premium && <PremiumBadge size={22} />}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[3] }}>
              {tier && rating !== undefined && (
                <Badge variant="tier" tier={tier}>
                  {`${tokens.tier[tier].label} · ${rating}`}
                </Badge>
              )}
              {/* Série en jours, relue sur `/api/profiles/{id}/activity`. */}
              {streak !== undefined && streak > 0 && <Pill icon={FireIcon}>{`${streak} jour${streak > 1 ? 's' : ''} de série`}</Pill>}
            </View>
          </View>
        }
        pages={TABS.map((page) => ({ ...page, content: <TabPage tab={page.value} home={home} /> }))}
      />
    </Screen>
  )
}
