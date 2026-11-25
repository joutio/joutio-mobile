import { router } from '@/shared/navigation/router'
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
import { useMe } from '@joutio/client/me'
import { useWearTitle } from '@/features/topic/hooks/use-topic'
import { dayLabel, formatNumber } from '@/features/topic/lib/format'
import type { GameHistoryItemView, TitleView, TopicStatView } from '@joutio/client/profile'
import type { GameOutcome } from '@joutio/client/game'
import { topicName } from '@/shared/utils/topic-name'
import type { BadgeFamilySummary } from '../lib/badges'
import { rankProgress, titleLabel } from '../lib/format'
import { useT } from '@/lib/i18n'

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
  const t = useT()
  return (
    <TabScrollView contentContainerStyle={PAGE}>
      <EmptyState
        icon={WarningCircleIcon}
        title={title}
        description={t('home.errorText')}
        action={
          <Button style={{ alignSelf: 'center' }} loading={retrying} onPress={onRetry}>
            {t('callback.retry')}
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

export function StatsTab({ streak, tier, rating, wins, draws, losses, topics, active, onStreak, onRanks, onPlayed }: StatsTabProps) {
  const t = useT()
  const played = wins + draws + losses
  const rank = tier ? rankProgress(tier, rating) : undefined
  const { categoryColor } = useTheme()
  // Référence stable : le donut est mémorisé et ne se redessine pas à chaque rendu de l'onglet.
  const donut = useMemo(
    () =>
      (topics ?? [])
        .filter((topic) => topic.games > 0)
        .map((topic) => ({ key: topic.topicId, label: topicName(topic.names), value: topic.games, color: categoryColor(toCategoryCode(topic.category)) })),
    [topics, categoryColor],
  )
  return (
    <TabScrollView contentContainerStyle={PAGE}>
      <View style={{ gap: tokens.space[4] }}>
        <SectionHeader
          title={t('profile.streak')}
          action={
            <Button variant="plain" size="S" onPress={onStreak}>
              {t('profile.calendar')}
            </Button>
          }
        />
        <Card>{streak ? <Streak count={streak.count} hint={streak.hint} week={streak.week} /> : <Skeleton shape="row" />}</Card>
      </View>
      {played === 0 ? (
        <EmptyState icon={ChartLineUpIcon} title={t('profile.noStatsTitle')} description={t('profile.noStatsText')} />
      ) : (
        <>
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader
              title={t('titles.rank')}
              action={
                <Button variant="plain" size="S" onPress={onRanks}>
                  {t('titles.allRanks')}
                </Button>
              }
            />
            <Card>
              {rank && tier && (
                <View style={{ gap: tokens.space[3] }}>
                  <ProgressBar value={rank.progress} label={rank.label} tone={tier} />
                  <Text variant="caption" color="muted">
                    {rank.next}
                  </Text>
                </View>
              )}
            </Card>
          </View>
          <View style={{ gap: tokens.space[4] }}>
            <SectionHeader title={t('profile.outcomes')} />
            {/* Toujours les trois blocs, puis la barre de ratio (décision du 2026-11-06). */}
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <Stat label={t('profile.wins')} value={formatNumber(wins)} tone="up" compact />
              <Stat label={draws > 1 ? t('profile.draws') : t('profile.draw')} value={formatNumber(draws)} compact />
              <Stat label={t('profile.losses')} value={formatNumber(losses)} tone="down" compact />
            </View>
            <Card>
              <OutcomeBar wins={wins} draws={draws} losses={losses} />
            </Card>
          </View>
          {donut.length > 0 && (
            <View style={{ gap: tokens.space[4] }}>
              <SectionHeader
                title={t('profile.playedTopics')}
                action={
                  <Button variant="plain" size="S" onPress={onPlayed}>
                    {t('home.seeAll')}
                  </Button>
                }
              />
              <Card padding={tokens.space[3]}>
                <TopicsDonut label={t('profile.playedTopics')} data={donut} play={active} />
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
  const t = useT()
  if (loading) return <Loading />
  if (error && !families) return <Failed title={t('profile.badgesError')} onRetry={onRetry} retrying={retrying} />
  const earned = (families ?? []).some((family) => family.earned > 0 || family.progress > 0)
  if (!families || !earned)
    return (
      <TabScrollView contentContainerStyle={PAGE}>
        <EmptyState icon={MedalIcon} title={t('profile.noBadgesTitle')} description={t('profile.noBadgesText')} />
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
          remaining={family.remaining}
          feats={family.feats}
          earned={family.earned}
          progress={family.progress}
          onPress={() => onOpen(family)}
        />
      ))}
    </TabScrollView>
  )
}

// ─── Titres ───

export interface TitlesTabProps {
  titles: readonly TitleView[] | undefined
  equippedKey: string | null | undefined
  loading: boolean
  error: boolean
  retrying: boolean
  onRetry: () => void
  onAll: () => void
}

/** Les 5 derniers titres débloqués, groupés par date de déblocage (`profil.md` § 2). */
export function TitlesTab({ titles, equippedKey, loading, error, retrying, onRetry, onAll }: TitlesTabProps) {
  const t = useT()
  const wear = useWearTitle()
  if (loading) return <Loading />
  if (error && !titles) return <Failed title={t('profile.titlesError')} onRetry={onRetry} retrying={retrying} />
  if (!titles || titles.length === 0)
    return (
      <TabScrollView contentContainerStyle={PAGE}>
        <EmptyState icon={CrownSimpleIcon} title={t('profile.noTitlesTitle')} description={t('profile.noTitlesText')} />
      </TabScrollView>
    )
  const recent = [...titles].sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt)).slice(0, 5)
  const groups: { day: string; titles: TitleView[] }[] = []
  for (const title of recent) {
    const day = dayLabel(new Date(title.unlockedAt))
    const last = groups[groups.length - 1]
    if (last?.day === day) last.titles.push(title)
    else groups.push({ day, titles: [title] })
  }
  return (
    <TabScrollView contentContainerStyle={{ ...PAGE, gap: tokens.space[4] }}>
      <SectionHeader
        title={t('profile.lastTitles')}
        action={
          <Button variant="plain" size="S" onPress={onAll}>
            {t('home.seeAll')}
          </Button>
        }
      />
      {groups.map((group) => (
        <View key={group.day} style={{ gap: tokens.space[3] }}>
          <Text variant="caption" weight="600" color="muted">
            {group.day}
          </Text>
          <ListGroup surface="surface">
            {group.titles.map((title, index) => (
              <TitleRow
                key={title.key}
                tier={title.tier}
                title={titleLabel(title)}
                topic={topicName(title.topic.names)}
                worn={equippedKey === title.key}
                wearing={wear.isPending && wear.variables === title.key}
                disabled={wear.isPending}
                onWear={() => wear.mutate(equippedKey === title.key ? null : title.key)}
                last={index === group.titles.length - 1}
              />
            ))}
          </ListGroup>
        </View>
      ))}
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
  const t = useT()
  const me = useMe()
  if (loading) return <Loading />
  if (error && !games) return <Failed title={t('topic.gamesError')} onRetry={onRetry} retrying={retrying} />
  const finished = (games ?? []).filter((game) => OUTCOMES[game.outcome]).slice(0, 10)
  if (finished.length === 0)
    return (
      <TabScrollView contentContainerStyle={PAGE}>
        <EmptyState icon={ClockCounterClockwiseIcon} title={t('history.empty')} description={t('history.emptyText')} />
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
        title={t('topic.lastGames')}
        action={
          <Button
            variant="plain"
            size="S"
            onPress={() => router.push({ pathname: '/profile/history', params: { userId: me.data?.userId, backLabel: t('nav.profile') } })}
          >
            {t('home.seeAll')}
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
                pictogram={game.topic.pictogramUrl ?? undefined}
                image={game.topic.imageUrl ?? undefined}
                sub={game.opponentType === 'BOT' ? t('room.training') : (game.opponent?.pseudonym ?? t('topic.opponent'))}
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
