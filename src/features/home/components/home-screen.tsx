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
  useTheme,
  WarningCircleIcon,
  compactBarProgress,
  useReducedMotion,
  type CategoryCode,
  type CollapsibleTabsRef,
} from '@/design-system'
import { useMe } from '@/features/me'
import type { TopicCardView } from '@/shared/types/bff'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { useHome, useUnreadCount } from '../hooks/use-home'
import { HOME_MOCKS } from '../lib/home-mocks'

const LANDSCAPE_WIDTH = 240
const PAGE_SIZE = 20
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
          <TopicCard key={topic.topicId} title={topicName(topic.names)} category={toCategoryCode(topic.category)} image={imageOf(topic)} />
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
          onSeeAll={seeAll}
        />
      )}
      {fresh.length > 0 && <TopicRail title="Nouveaux thèmes" topics={fresh} onSeeAll={seeAll} />}
    </>
  )
}

/**
 * Sujets suivis : puces d'univers à sélection multiple (« Tous » par défaut), 20 par page. `loadMore` change à chaque
 * traction réussie en bas de l'onglet (`DragToLoadMore`) ; `onHasMore` dit s'il reste une page.
 */
function Followed({ topics, loadMore, onHasMore }: { topics: TopicCardView[]; loadMore: number; onHasMore: (hasMore: boolean) => void }) {
  const { colors, radius } = useTheme()
  const [selected, setSelected] = useState<CategoryCode[]>([])
  const [pages, setPages] = useState(1)
  const universes = useMemo(() => [...new Set(topics.map((topic) => toCategoryCode(topic.category)))], [topics])
  const filtered = topics.filter((topic) => selected.length === 0 || selected.includes(toCategoryCode(topic.category)))
  const visible = filtered.slice(0, pages * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  useEffect(() => {
    if (loadMore > 0) setPages((current) => (current * PAGE_SIZE < filtered.length ? current + 1 : current))
    // Seul le geste déclenche la page suivante.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMore])
  useEffect(() => onHasMore(hasMore), [hasMore, onHasMore])

  // Changer de puces remet la pagination à la première page.
  const select = (next: CategoryCode[]) => {
    setSelected(next)
    setPages(1)
  }
  const toggle = (category: CategoryCode) => select(selected.includes(category) ? selected.filter((item) => item !== category) : [...selected, category])

  return (
    <View style={{ gap: tokens.space[4] }}>
      <ScrollView
        horizontal
        scrollsToTop={false}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: tokens.space[3] }}
      >
        <Chip selected={selected.length === 0} onPress={() => select([])}>
          Tous
        </Chip>
        {universes.map((category) => (
          <Chip key={category} selected={selected.includes(category)} onPress={() => toggle(category)}>
            {tokens.category[category].label}
          </Chip>
        ))}
      </ScrollView>
      <View style={{ marginHorizontal: GUTTER, overflow: 'hidden', borderRadius: radius.lg, backgroundColor: colors.surface }}>
        {visible.map((topic, index) => (
          <TopicRow
            key={topic.topicId}
            title={topicName(topic.names)}
            category={toCategoryCode(topic.category)}
            image={imageOf(topic)}
            last={index === visible.length - 1}
          />
        ))}
      </View>
      <FeedFooter
        style={{ marginHorizontal: GUTTER }}
        state={hasMore ? 'more' : 'end'}
        onLoadMore={() => setPages(pages + 1)}
        endLabel="Tu as vu tous tes sujets suivis"
        remainingLabel={hasMore ? remainingFollowed(filtered.length - visible.length) : undefined}
      />
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
  const empty = data && (followed ? data.followedTopics.length === 0 : data.trendingTopics.length === 0 && data.newTopics.length === 0)
  // Suite des sujets suivis : traction en bas de l'onglet (pages locales, sans requête).
  const [loadMore, setLoadMore] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  return (
    <DragToLoadMore enabled={followed && hasMore} onLoadMore={() => setLoadMore((count) => count + 1)}>
      <TabLoadMoreScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: tokens.space[7], paddingTop: tokens.space[5], paddingBottom: tokens.space[7] }}
      >
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
          (followed ? (
            <Followed topics={data.followedTopics} loadMore={loadMore} onHasMore={setHasMore} />
          ) : (
            <ForYou trending={data.trendingTopics} fresh={data.newTopics} />
          ))}
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
        <IconButton icon={BellIcon} label="Notifications" variant="plain" tone="neutral" badge={unread.data?.count || undefined} />
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
              {/* Mock : série en jours non exposée par le BFF (`home-mocks.ts`). */}
              <Pill icon={FireIcon}>{`${HOME_MOCKS.streakDays} jours de série`}</Pill>
            </View>
          </View>
        }
        pages={TABS.map((page) => ({ ...page, content: <TabPage tab={page.value} home={home} /> }))}
      />
    </Screen>
  )
}
