import { router } from 'expo-router'
import { useMemo } from 'react'
import { View } from 'react-native'
import {
  Button,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CrownSimpleIcon,
  EmptyState,
  ListGroup,
  MatchRow,
  MedalIcon,
  OutcomeBar,
  ProgressBar,
  SectionHeader,
  Skeleton,
  Stat,
  Streak,
  TabScrollView,
  Text,
  TitleRow,
  toCategoryCode,
  tokens,
  TopicsDonut,
  useTheme,
  WarningCircleIcon,
  BadgeFamilyRow,
  type MatchOutcome,
  type TierCode,
} from '@/design-system'
import { useMe } from '@/features/me'
import { useWearTitle } from '@/features/topic/hooks/use-topic'
import { dayLabel, formatNumber } from '@/features/topic/lib/format'
import type { GameHistoryItemView, GameOutcome, MasteryTier, TitleView, TopicStatView } from '@joutio/client-domain/api-types'
import { topicName } from '@/shared/utils/topic-name'
import type { BadgeFamilySummary } from '../lib/badges'
import { rankProgress, titleLabel } from '../lib/format'

const GUTTER = tokens.space[5]
const PAGE = { gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }
const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }

function Card({ children, padding = tokens.space[5] }: { children: React.ReactNode; padding?: number }) {
  const { colors, radius } = useTheme()
  return <View style={{ borderRadius: radius.lg, backgroundColor: colors.surface, padding }}>{children}</View>
}

function Loading() {
  return (
    <TabScrollView scrollEnabled={false} contentContainerStyle={PAGE}>
      <Skeleton shape="card" />
      <Skeleton shape="card" />
    </TabScrollView>
  )
}

function Failed({ title, onRetry, retrying }: { title: string; onRetry: () => void; retrying: boolean }) {
  return (
    <TabScrollView contentContainerStyle={PAGE}>
      <EmptyState
        icon={WarningCircleIcon}
        title={title}
        description="Vérifie ta connexion, puis réessaie."
        action={
          <Button style={{ alignSelf: 'center' }} loading={retrying} onPress={onRetry}>
            Réessayer
          </Button>
        }
      />
    </TabScrollView>
  )
}

// ─── Statistiques ───

export interface StatsTabProps {
  streak: { count: number; hint: string; week: import('@/design-system').StreakDay[] } | undefined
  tier: TierCode | undefined
  rating: number
  provisional: boolean
  wins: number
  draws: number
  losses: number
  topics: readonly TopicStatView[] | undefined
  /** Onglet affiché : le donut se dessine à son arrivée. */
  active: boolean
  onStreak: () => void
  onRanks: () => void
  onPlayed: () => void
}

export function StatsTab({ streak, tier, rating, provisional, wins, draws, losses, topics, active, onStreak, onRanks, onPlayed }: StatsTabProps) {
  const played = wins + draws + losses
  const rank = tier && !provisional ? rankProgress(tier, rating) : undefined
  // Référence stable : le donut est mémorisé et ne se redessine pas à chaque rendu de l'onglet.
  const donut = useMemo(
    () =>
      (topics ?? [])
        .filter((topic) => topic.games > 0)
        .map((topic) => ({ key: topic.topicId, label: topicName(topic.names), value: topic.games, color: topic.color ?? tokens.category.GENERAL.color })),
    [topics],
  )
  return (
    <TabScrollView contentContainerStyle={PAGE}>
      <View style={{ gap: tokens.space[4] }}>
        <SectionHeader
          title="Série"
          action={
            <Button variant="plain" size="S" onPress={onStreak}>
              Calendrier
            </Button>
          }
        />
        <Card>{streak ? <Streak count={streak.count} hint={streak.hint} week={streak.week} /> : <Skeleton shape="row" />}</Card>
      </View>
      {played === 0 ? (
        <EmptyState icon={ChartLineUpIcon} title="Pas encore de statistiques" description="Joue tes premiers duels pour voir ton bilan." />
      ) : (
        <>
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader
              title="Rang"
              action={
                <Button variant="plain" size="S" onPress={onRanks}>
                  Tous les rangs
                </Button>
              }
            />
            <Card>
              {rank && tier ? (
                <View style={{ gap: tokens.space[3] }}>
                  <ProgressBar value={rank.progress} label={rank.label} tone={tier} />
                  <Text variant="caption" color="muted">
                    {rank.next}
                  </Text>
                </View>
              ) : (
                <Text variant="callout" color="muted">
                  Ton rang s'affiche après tes premiers duels classés.
                </Text>
              )}
            </Card>
          </View>
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader title="Bilan" />
            {/* Toujours les trois blocs, puis la barre de ratio (décision du 2026-11-06). */}
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <Stat label="Victoires" value={formatNumber(wins)} tone="up" compact />
              <Stat label={draws > 1 ? 'Nuls' : 'Nul'} value={formatNumber(draws)} compact />
              <Stat label="Défaites" value={formatNumber(losses)} tone="down" compact />
            </View>
            <Card>
              <OutcomeBar wins={wins} draws={draws} losses={losses} />
            </Card>
          </View>
          {donut.length > 0 && (
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader
                title="Sujets joués"
                action={
                  <Button variant="plain" size="S" onPress={onPlayed}>
                    Tout voir
                  </Button>
                }
              />
              <Card padding={tokens.space[3]}>
                <TopicsDonut label="Sujets joués" data={donut} play={active} />
              </Card>
            </View>
          )}
        </>
      )}
    </TabScrollView>
  )
}

// ─── Badges ───

export interface BadgesTabProps {
  families: readonly BadgeFamilySummary[] | undefined
  summary: string | undefined
  loading: boolean
  error: boolean
  retrying: boolean
  onRetry: () => void
  onOpen: (family: BadgeFamilySummary) => void
}

export function BadgesTab({ families, summary, loading, error, retrying, onRetry, onOpen }: BadgesTabProps) {
  if (loading) return <Loading />
  if (error && !families) return <Failed title="Impossible de charger tes badges" onRetry={onRetry} retrying={retrying} />
  const earned = (families ?? []).some((family) => family.earned > 0 || family.progress > 0)
  if (!families || !earned)
    return (
      <TabScrollView contentContainerStyle={PAGE}>
        <EmptyState icon={MedalIcon} title="Aucun badge pour l'instant" description="Joue tes premiers duels pour lancer ta collection." />
      </TabScrollView>
    )
  return (
    <TabScrollView contentContainerStyle={{ ...PAGE, gap: tokens.space[4] }}>
      {summary && (
        <Text variant="caption" color="muted">
          {summary}
        </Text>
      )}
      {families.map((family) => (
        <BadgeFamilyRow
          key={family.family}
          name={family.name}
          icon={family.icon}
          meta={family.meta}
          earned={family.earned}
          progress={family.progress}
          onPress={() => onOpen(family)}
        />
      ))}
    </TabScrollView>
  )
}

// ─── Titres ───

const TIER_ORDER: MasteryTier[] = ['DIAMANT', 'EMERAUDE', 'PLATINE', 'OR', 'ARGENT', 'BRONZE', 'FER']

export interface TitlesTabProps {
  titles: readonly TitleView[] | undefined
  equippedKey: string | null | undefined
  loading: boolean
  error: boolean
  retrying: boolean
  onRetry: () => void
  onAll: () => void
}

/**
 * Les 5 titres les plus hauts. Le BFF ne date pas les déblocages (`TitlesView` sans `unlockedAt`) : le groupage par
 * date de la spec attend ce champ (`profil.md` § 5).
 */
export function TitlesTab({ titles, equippedKey, loading, error, retrying, onRetry, onAll }: TitlesTabProps) {
  const wear = useWearTitle()
  if (loading) return <Loading />
  if (error && !titles) return <Failed title="Impossible de charger tes titres" onRetry={onRetry} retrying={retrying} />
  if (!titles || titles.length === 0)
    return (
      <TabScrollView contentContainerStyle={PAGE}>
        <EmptyState icon={CrownSimpleIcon} title="Aucun titre pour l'instant" description="Progresse dans un sujet pour décrocher ton premier titre." />
      </TabScrollView>
    )
  const shown = [...titles].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)).slice(0, 5)
  return (
    <TabScrollView contentContainerStyle={{ ...PAGE, gap: tokens.space[4] }}>
      <SectionHeader
        title="Meilleurs titres"
        action={
          <Button variant="plain" size="S" onPress={onAll}>
            Tout voir
          </Button>
        }
      />
      <ListGroup surface="surface">
        {shown.map((title, index) => (
          <TitleRow
            key={title.key}
            tier={title.tier}
            title={titleLabel(title)}
            topic={topicName(title.topic.names)}
            worn={equippedKey === title.key}
            wearing={wear.isPending && wear.variables === title.key}
            disabled={wear.isPending}
            onWear={() => wear.mutate(equippedKey === title.key ? null : title.key)}
            last={index === shown.length - 1}
          />
        ))}
      </ListGroup>
    </TabScrollView>
  )
}

// ─── Historique ───

export interface HistoryTabProps {
  games: readonly GameHistoryItemView[] | undefined
  loading: boolean
  error: boolean
  retrying: boolean
  onRetry: () => void
}

export function HistoryTab({ games, loading, error, retrying, onRetry }: HistoryTabProps) {
  const me = useMe(true)
  if (loading) return <Loading />
  if (error && !games) return <Failed title="Impossible de charger tes parties" onRetry={onRetry} retrying={retrying} />
  const finished = (games ?? []).filter((game) => OUTCOMES[game.outcome]).slice(0, 10)
  if (finished.length === 0)
    return (
      <TabScrollView contentContainerStyle={PAGE}>
        <EmptyState icon={ClockCounterClockwiseIcon} title="Aucune partie pour l'instant" description="Tes duels et entraînements apparaîtront ici." />
      </TabScrollView>
    )
  const groups: { day: string; games: GameHistoryItemView[] }[] = []
  for (const game of finished) {
    const day = dayLabel(new Date(game.playedAt))
    const last = groups[groups.length - 1]
    if (last?.day === day) last.games.push(game)
    else groups.push({ day, games: [game] })
  }
  return (
    <TabScrollView contentContainerStyle={{ ...PAGE, gap: tokens.space[4] }}>
      <SectionHeader
        title="Dernières parties"
        action={
          <Button
            variant="plain"
            size="S"
            onPress={() => router.push({ pathname: '/profile/history', params: { userId: me.data?.userId, backLabel: 'Profil' } })}
          >
            Tout voir
          </Button>
        }
      />
      {groups.map((group) => (
        <View key={group.day} style={{ gap: tokens.space[3] }}>
          <Text variant="caption" weight="600" color="muted">
            {group.day}
          </Text>
          <ListGroup surface="surface">
            {group.games.map((game, index) => (
              <MatchRow
                key={game.gameId}
                topic={topicName(game.topic.names)}
                category={toCategoryCode(game.topic.category)}
                image={game.topic.imageUrl ?? undefined}
                sub={game.opponentType === 'BOT' ? 'Entraînement' : (game.opponent?.pseudonym ?? 'Adversaire')}
                outcome={OUTCOMES[game.outcome] ?? 'draw'}
                score={`${game.myScore} · ${game.opponentScore}`}
                bot={game.opponentType === 'BOT'}
                last={index === group.games.length - 1}
                onPress={() =>
                  router.push({
                    pathname: '/result/[gameId]',
                    params: { gameId: game.gameId, topicName: topicName(game.topic.names), topicId: game.topic.topicId, category: game.topic.category ?? '' },
                  })
                }
              />
            ))}
          </ListGroup>
        </View>
      ))}
    </TabScrollView>
  )
}
