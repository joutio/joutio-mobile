import { topicDescription } from '@joutio/client-domain/authoring'
import { useShare } from '@/features/share'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { View } from 'react-native'
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
  ShareNetworkIcon,
  PencilSimpleIcon,
  Skeleton,
  ProgressBar,
  Stat,
  TabScrollView,
  useTransitionDone,
  Pill,
  Text,
  useTheme,
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

// MVP : conserver le Mur et ses maquettes pour sa réactivation.
const WALL_ENABLED: boolean = false

const TABS = [
  { value: 'games', label: 'Parties' },
  { value: 'board', label: 'Classement' },
  ...(WALL_ENABLED ? [{ value: 'wall' as const, label: 'Mur' }] : []),
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

export type TopicStack = 'home' | 'topics' | 'profile' | 'social'

const TOPIC_PATH = { home: '/home/topic/[id]', topics: '/topics/[id]', profile: '/profile/topic/[id]', social: '/social/topic/[id]' } as const
const RANKINGS_PATH = { home: '/home/rankings', topics: '/topics/rankings', profile: '/profile/rankings', social: '/social/rankings' } as const
const HISTORY_PATH = { home: '/home/history', topics: '/topics/history', profile: '/profile/history', social: '/social/history' } as const

/** Ouvre la Fiche sujet depuis un onglet (Accueil, Sujets, Profil ou Social), dans la pile de cet onglet. */
export function openTopic(
  tab: TopicStack,
  topic: { topicId: string; names: Record<string, string>; bannerUrl: string | null; imageUrl: string | null; category: string | null },
) {
  router.push({
    pathname: TOPIC_PATH[tab],
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
 * Parties, Classement et Progression (Mur conservé, désactivé pour le MVP). Tirer recharge toute la page.
 */
export function TopicScreen({ stack = 'home' }: { stack?: TopicStack }) {
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

  const [tab, setTab] = useState<Tab>('games')
  const [duelOpen, setDuelOpen] = useState(false)
  const [postOpen, setPostOpen] = useState(false)
  const [commented, setCommented] = useState<WallPostMock>()
  const [actionsHeight, setActionsHeight] = useState<number>()

  const data = overview.data
  const topic = data?.topic
  // Description dans la langue du joueur, sinon la française (2026-11-13).
  const description = topic ? topicDescription(topic, me.data?.language ?? 'fr') : null
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
  const shareLink = useShare()
  const share = () => shareLink({ kind: 'topic', id: topicId, message: `${name} sur Joutio : viens me défier !`, title: 'Partager le sujet' })

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
        eyebrow={<Pill category={category}>{tokens.category[category].label}</Pill>}
        onBack={() => router.back()}
        barTitleStart
        dockAt={actionsHeight}
        right={(docked) => (
          <>
            {docked && (
              <>
                <ParallaxIconButton icon={LightningIcon} label="Lancer un duel" disabled={topic?.status !== 'PUBLISHED'} onPress={() => setDuelOpen(true)} />
                <ParallaxIconButton icon={HeartIcon} label={followed ? 'Ne plus suivre' : 'Suivre'} filled={followed} onPress={toggleFollow} />
              </>
            )}
            {overview.data?.permissions?.canContribute && (
              <ParallaxIconButton
                icon={PencilSimpleIcon}
                label="Modifier le sujet"
                onPress={() => router.push({ pathname: '/workshop/[id]', params: { id: topicId } })}
              />
            )}
            <ParallaxIconButton icon={ShareNetworkIcon} label="Partager" onPress={share} />
          </>
        )}
        intro={
          <View style={{ gap: tokens.space[4] }}>
            {/* Description du sujet, sous le titre de l'image (2026-11-13), saisie dans l'atelier. */}
            {!!description && <Text color="muted">{description}</Text>}
            <View
              onLayout={(event) => setActionsHeight(event.nativeEvent.layout.y + event.nativeEvent.layout.height)}
              style={{ flexDirection: 'row', gap: tokens.space[3] }}
            >
              {/* 65 / 35 : le duel est l'action principale. */}
              <Button full icon={LightningIcon} style={{ flex: 65 }} disabled={topic?.status !== 'PUBLISHED'} onPress={() => setDuelOpen(true)}>
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
            {topic?.status === 'DRAFT' && <Text color="muted">Ce sujet est en brouillon. Les nouveaux départs de partie sont désactivés.</Text>}
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              {data
                ? stats.map((stat) => <Stat key={stat.label} {...stat} compact />)
                : stats.map((stat) => <Skeleton key={stat.label} shape="card" style={{ flex: 1, height: 76 }} />)}
            </View>
            {/* Questions déjà jouées sur le total du sujet, en carte comme les sections Bilan, sans titre (`fiche-sujet.md`
                § 1, 2026-11-07) : « Progression » seul ne disait pas ce qui progressait. */}
            {data && (
              <PlayedQuestions
                done={data.myProgress?.completedQuestions ?? 0}
                total={data.myProgress?.totalQuestions ?? data.topic.questionsCount}
                percent={data.myProgress?.completionPercent ?? 0}
              />
            )}
          </View>
        }
        tabsLabel="Contenu du sujet"
        initialTab="games"
        onTabChange={setTab}
        tabs={[
          {
            value: 'games',
            label: 'Parties',
            content: <GamesTab topicId={topicId} topicName={name} historyPath={HISTORY_PATH[stack]} />,
          },
          {
            value: 'board',
            label: 'Classement',
            content: <BoardTab topicId={topicId} topicName={name} rankingsPath={RANKINGS_PATH[stack]} bottomInset={showMyRow ? 64 : 0} />,
          },
          ...(WALL_ENABLED ? [{ value: 'wall' as const, label: 'Mur', content: <WallTab wall={wall} onComment={setCommented} /> }] : []),
          { value: 'progress', label: 'Progression', content: data ? <ProgressTab overview={data} /> : <Loading /> },
        ]}
        floating={
          WALL_ENABLED && tab === 'wall' ? (
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

const questionsLabel = (count: number) => `${formatNumber(count)} question${count > 1 ? 's' : ''}`

/** Questions jouées : la part du sujet déjà vue en duel, et ce qui reste à découvrir. */
function PlayedQuestions({ done, total, percent }: { done: number; total: number; percent: number }) {
  const { colors, radius } = useTheme()
  const left = Math.max(0, total - done)
  return (
    <View style={{ gap: tokens.space[2], borderRadius: radius.lg, backgroundColor: colors.surface, padding: tokens.space[5] }}>
      <ProgressBar label={`${formatNumber(done)} / ${questionsLabel(total)} jouées`} value={percent} showValue />
      <Text variant="caption" color="muted">
        {left === 0 ? 'Tu as joué toutes les questions de ce sujet.' : `Encore ${questionsLabel(left)} à découvrir en duel.`}
      </Text>
    </View>
  )
}
