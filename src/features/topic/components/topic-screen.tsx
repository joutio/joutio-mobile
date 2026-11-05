import { useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Share, View } from 'react-native'
import {
  Button,
  CheckIcon,
  showDialog,
  CollapsibleTabsScreen,
  EmptyState,
  HeartIcon,
  IconButton,
  LightningIcon,
  ParallaxIconButton,
  PencilSimpleIcon,
  ShareNetworkIcon,
  Skeleton,
  Stat,
  TabScrollView,
  useTransitionDone,
  Text,
  toCategoryCode,
  tokens,
  WarningCircleIcon,
} from '@/design-system'
import { useMe } from '@/features/me'
import { queryKeys } from '@/lib/query-keys'
import { topicName } from '@/shared/utils/topic-name'
import { useFollowTopic, useTopicLeaderboard, useTopicOverview } from '../hooks/use-topic'
import { formatNumber, tierLabel } from '../lib/format'
import type { WallPostMock } from '../lib/wall-mocks'
import { BOARD_TOP, BoardTab, MyBoardRow } from './board-tab'
import { DuelSheet } from './duel-sheet'
import { GamesTab } from './games-tab'
import { ProgressTab } from './progress-tab'
import { CommentsSheet, PostSheet, useWall, WallTab } from './wall-tab'

const TABS = [
  { value: 'wall', label: 'Mur' },
  { value: 'board', label: 'Classement' },
  { value: 'games', label: 'Parties' },
  { value: 'progress', label: 'Progression' },
] as const
type Tab = (typeof TABS)[number]['value']

/** Paramètres de navigation : l'en-tête s'affiche sans attendre l'overview. */
export interface TopicRouteParams {
  id: string
  name?: string
  image?: string
  category?: string
  [key: string]: string | undefined
}

/** Ouvre la Fiche sujet depuis un onglet (Accueil ou Sujets), dans la pile de cet onglet. */
export function openTopic(
  tab: 'home' | 'topics',
  topic: { topicId: string; names: Record<string, string>; bannerUrl: string | null; imageUrl: string | null; category: string | null },
) {
  router.push({
    pathname: tab === 'home' ? '/home/topic/[id]' : '/topics/[id]',
    params: { id: topic.topicId, name: topicName(topic.names), image: topic.bannerUrl ?? topic.imageUrl ?? undefined, category: topic.category ?? undefined },
  })
}

function Loading() {
  return (
    <TabScrollView contentContainerStyle={{ gap: tokens.space[4], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2] }}>
      <Skeleton shape="row" />
      <Skeleton shape="card" />
      <Skeleton shape="card" />
    </TabScrollView>
  )
}

/**
 * Fiche sujet (`design/specs/screens/fiche-sujet.md`) : image en parallaxe, actions et chiffres du sujet, onglets
 * Mur (mock), Classement, Parties et Progression. Tirer recharge toute la page.
 */
export function TopicScreen({ stack = 'home' }: { stack?: 'home' | 'topics' }) {
  const params = useLocalSearchParams<TopicRouteParams>()
  const topicId = params.id
  const client = useQueryClient()
  const me = useMe(true)
  const pseudonym = me.data?.pseudonym ?? 'Moi'
  const overview = useTopicOverview(topicId)
  // L'écran s'ouvre tout de suite (titre et image viennent de la navigation) ; le contenu lourd attend la fin de la
  // transition, des squelettes à sa place.
  const ready = useTransitionDone()
  const board = useTopicLeaderboard(topicId, ready)
  const follow = useFollowTopic(topicId)
  const wall = useWall(pseudonym)

  const [tab, setTab] = useState<Tab>('wall')
  const [duelOpen, setDuelOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)
  const [commented, setCommented] = useState<WallPostMock>()
  const [actionsHeight, setActionsHeight] = useState<number>()

  const data = overview.data
  const topic = data?.topic
  const name = topic ? topicName(topic.names) : (params.name ?? '')
  const category = toCategoryCode(topic?.category ?? params.category)
  const image = topic?.bannerUrl ?? topic?.imageUrl ?? params.image ?? undefined
  const followed = topic?.followed ?? false

  const myEntry = board.data?.me
  const showMyRow = tab === 'board' && myEntry && myEntry.rank > BOARD_TOP

  const toggleFollow = () => {
    // Une requête en cours : on ignore les appuis répétés.
    if (!topic || follow.isPending) return
    if (!followed) return follow.mutate(true)
    // Ne plus suivre se confirme : on évite les allers-retours en rafale (et les notifications d'abonnés qui vont avec).
    showDialog({
      title: `Ne plus suivre ${name} ?`,
      message: 'Il disparaîtra de tes sujets suivis sur l’Accueil.',
      icon: HeartIcon,
      tone: 'danger',
      sheet: true,
      actions: [
        { label: 'Ne plus suivre', tone: 'destructive', onPress: () => follow.mutate(false) },
        { label: 'Annuler', variant: 'plain' },
      ],
    })
  }
  const share = () => void Share.share({ message: `${name} sur Joutio : viens me défier !` })

  if (overview.isError && !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: tokens.space[5] }}>
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger le sujet"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <View style={{ alignSelf: 'center', flexDirection: 'row', gap: tokens.space[3] }}>
              <Button variant="gray" tone="neutral" onPress={() => router.back()}>
                Retour
              </Button>
              <Button loading={overview.isRefetching} onPress={() => void overview.refetch()}>
                Réessayer
              </Button>
            </View>
          }
        />
      </View>
    )
  }

  const stats = [
    { label: 'Maîtrise', value: data?.myProgress ? tierLabel(data.myProgress.tier) : '—' },
    { label: 'Abonnés', value: topic ? formatNumber(topic.followersCount) : '—' },
    { label: 'Questions', value: topic ? formatNumber(topic.questionsCount) : '—' },
  ]

  return (
    <>
      <CollapsibleTabsScreen<Tab>
        image={image}
        title={name}
        eyebrow={
          <Text variant="caption" weight="600" color={tokens.category[category].color}>
            {tokens.category[category].label}
          </Text>
        }
        onBack={() => router.back()}
        barTitleStart
        dockAt={actionsHeight}
        right={(docked) => (
          <>
            {docked && (
              <>
                <ParallaxIconButton icon={LightningIcon} label="Lancer un duel" onPress={() => setDuelOpen(true)} />
                <ParallaxIconButton icon={HeartIcon} label={followed ? 'Ne plus suivre' : 'Suivre'} filled={followed} onPress={toggleFollow} />
              </>
            )}
            <ParallaxIconButton icon={ShareNetworkIcon} label="Partager" onPress={share} />
          </>
        )}
        intro={
          <View style={{ gap: tokens.space[4] }}>
            <View
              onLayout={(event) => setActionsHeight(event.nativeEvent.layout.y + event.nativeEvent.layout.height)}
              style={{ flexDirection: 'row', gap: tokens.space[3] }}
            >
              {/* 65 / 35 : le duel est l'action principale. */}
              <Button full icon={LightningIcon} style={{ flex: 65 }} onPress={() => setDuelOpen(true)}>
                Lancer un duel
              </Button>
              <Button
                full
                icon={followed ? CheckIcon : undefined}
                variant={followed ? 'gray' : 'tinted'}
                tone={followed ? 'neutral' : 'accent'}
                disabled={!topic}
                accessibilityState={{ selected: followed }}
                loading={follow.isPending}
                style={{ flex: 35 }}
                onPress={toggleFollow}
              >
                {followed ? 'Suivi' : 'Suivre'}
              </Button>
            </View>
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              {data
                ? stats.map((stat) => <Stat key={stat.label} {...stat} compact />)
                : stats.map((stat) => <Skeleton key={stat.label} shape="card" style={{ flex: 1, height: 76 }} />)}
            </View>
          </View>
        }
        tabsLabel="Contenu du sujet"
        initialTab="wall"
        onTabChange={setTab}
        tabs={[
          { value: 'wall', label: 'Mur', content: <WallTab wall={wall} onComment={setCommented} /> },
          {
            value: 'board',
            label: 'Classement',
            content: (
              <BoardTab
                topicId={topicId}
                topicName={name}
                rankingsPath={stack === 'home' ? '/home/rankings' : '/topics/rankings'}
                bottomInset={showMyRow ? 64 : 0}
              />
            ),
          },
          {
            value: 'games',
            label: 'Parties',
            content: <GamesTab topicId={topicId} topicName={name} historyPath={stack === 'home' ? '/home/history' : '/topics/history'} />,
          },
          { value: 'progress', label: 'Progression', content: data ? <ProgressTab overview={data} /> : <Loading /> },
        ]}
        floating={
          tab === 'wall' ? (
            <IconButton icon={PencilSimpleIcon} label="Partager une anecdote" variant="filled" tone="accent" size="L" onPress={() => setPostOpen(true)} />
          ) : undefined
        }
        bottomBar={showMyRow ? <MyBoardRow entry={myEntry} /> : undefined}
        onRefresh={() => client.refetchQueries({ queryKey: queryKeys.topic.all(topicId) })}
      />
      <DuelSheet open={duelOpen} onClose={() => setDuelOpen(false)} topic={{ topicId, name, category }} />
      <PostSheet open={postOpen} onClose={() => setPostOpen(false)} topic={name} onPublish={wall.publish} />
      <CommentsSheet post={commented} me={pseudonym} onClose={() => setCommented(undefined)} />
    </>
  )
}
