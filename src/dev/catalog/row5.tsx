import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useRef } from 'react'
import { type FlatList } from 'react-native'
import Animated, { useAnimatedRef } from 'react-native-reanimated'
import {
  Button,
  CollapsibleTabsScreen,
  EmptyState,
  FeedFooter,
  HeartIcon,
  ListRow,
  ParallaxIconButton,
  ParallaxScreen,
  SectionHeader,
  ShareNetworkIcon,
  SwordIcon,
  TabList,
  TabScrollView,
  Text,
  tokens,
  TrophyIcon,
  type CollapsibleTabsRef,
  type FeedFooterState,
} from '@/design-system'
import { SAMPLE_BANNER, Specimen } from './kit'

export function SectionHeaderDemo() {
  return (
    <>
      <SectionHeader title="Pour toi" />
      <SectionHeader
        title="Classement"
        subtitle="Ce mois-ci"
        action={
          <Button variant="plain" size="S">
            Tout voir
          </Button>
        }
      />
    </>
  )
}

export function EmptyStateDemo() {
  return (
    <EmptyState
      icon={TrophyIcon}
      title="Aucune partie pour l'instant"
      description="Lance un premier duel pour entrer au classement de ce sujet."
      action={
        <Button full icon={SwordIcon}>
          Lancer un duel
        </Button>
      }
    />
  )
}

export function FeedFooterDemo() {
  const states: FeedFooterState[] = ['more', 'loading', 'error', 'end']
  return (
    <>
      {states.map((state) => (
        <Specimen key={state} label={state}>
          <FeedFooter state={state} onLoadMore={() => undefined} onRetry={() => undefined} />
        </Specimen>
      ))}
    </>
  )
}

const TOPIC_TABS = [
  { value: 'wall', label: 'Mur' },
  { value: 'ranking', label: 'Classement' },
  { value: 'games', label: 'Parties' },
  { value: 'progress', label: 'Progression' },
] as const

const ROWS = Array.from({ length: 200 }, (_, index) => index + 1)

function RowsTab({ label, scrollTo }: { label: string; scrollTo?: number }) {
  const list = useRef<FlatList<number>>(null)
  // Dev : `?scroll=` fait défiler la liste après le montage, pour vérifier l'en-tête replié sans toucher l'écran.
  useEffect(() => {
    if (!scrollTo) return
    const timer = setTimeout(() => list.current?.scrollToOffset({ offset: scrollTo, animated: false }), 600)
    return () => clearTimeout(timer)
  }, [scrollTo])
  return (
    <TabList
      ref={list}
      data={ROWS}
      keyExtractor={(item) => String(item)}
      renderItem={({ item }) => <ListRow label={`${label} ${item}`} sub="Ligne virtualisée" control="none" last={item === ROWS.length} />}
    />
  )
}

/** Plein écran : fiche sujet avec onglets (`?tab=games&scroll=900` en dev). */
export function CollapsibleTabsScreenDemo() {
  const params = useLocalSearchParams<{ tab?: string; scroll?: string }>()
  const tabsRef = useRef<CollapsibleTabsRef>(null)
  useEffect(() => {
    if (!params.tab) return
    const timer = setTimeout(
      () =>
        tabsRef.current?.setIndex(
          Math.max(
            0,
            TOPIC_TABS.findIndex((tab) => tab.value === params.tab),
          ),
          { animated: false },
        ),
      1200,
    )
    return () => clearTimeout(timer)
  }, [params.tab])
  return (
    <CollapsibleTabsScreen
      tabsRef={tabsRef}
      image={SAMPLE_BANNER}
      title="Égypte antique"
      eyebrow={
        <Text variant="caption" weight="600" color={tokens.category.HISTORY.color}>
          {tokens.category.HISTORY.label}
        </Text>
      }
      onBack={() => router.back()}
      right={
        <>
          <ParallaxIconButton icon={HeartIcon} label="Suivre" />
          <ParallaxIconButton icon={ShareNetworkIcon} label="Partager" />
        </>
      }
      intro={<Text color="muted">1 240 abonnés · 320 questions</Text>}
      tabsLabel="Onglets du sujet"
      tabs={[
        { value: 'wall', label: 'Mur', content: <RowsTab label="Message" scrollTo={params.scroll ? Number(params.scroll) : undefined} /> },
        { value: 'ranking', label: 'Classement', content: <RowsTab label="Joueur" /> },
        {
          value: 'games',
          label: 'Parties',
          content: (
            <TabScrollView>
              <EmptyState icon={SwordIcon} title="Aucune partie" description="Tes duels sur ce sujet apparaîtront ici." />
            </TabScrollView>
          ),
        },
        { value: 'progress', label: 'Progression', content: <RowsTab label="Palier" /> },
      ]}
    />
  )
}

/** Plein écran : écran à en-tête image sans onglets (`?pull=200` simule un tiré vers le bas, iOS). */
export function ParallaxScreenDemo() {
  const { pull } = useLocalSearchParams<{ pull?: string }>()
  const scroller = useAnimatedRef<Animated.ScrollView>()
  useEffect(() => {
    if (!pull) return
    const timer = setTimeout(() => scroller.current?.scrollTo({ y: -Number(pull), animated: false }), 800)
    return () => clearTimeout(timer)
  }, [pull, scroller])
  return (
    <ParallaxScreen
      scrollRef={scroller}
      image={SAMPLE_BANNER}
      title="Égypte antique"
      eyebrow={
        <Text variant="caption" weight="600" color={tokens.category.HISTORY.color}>
          {tokens.category.HISTORY.label}
        </Text>
      }
      onBack={() => router.back()}
      right={<ParallaxIconButton icon={ShareNetworkIcon} label="Partager" />}
      intro={<Text color="muted">1 240 abonnés · 320 questions</Text>}
    >
      {ROWS.slice(0, 30).map((item) => (
        <ListRow key={item} label={`Question ${item}`} control="none" last={item === 30} />
      ))}
    </ParallaxScreen>
  )
}
