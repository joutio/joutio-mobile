import { router } from '@/shared/navigation/router'
import {
  Button,
  EmptyState,
  ListGroup,
  Podium,
  PlayerRow,
  SectionHeader,
  Skeleton,
  TabScrollView,
  Text,
  tokens,
  TrophyIcon,
  WarningCircleIcon,
} from '@/design-system'
import type { LeaderboardEntryView } from '@joutio/client/api-types'
import { usePlayerIdentity } from '@/features/me'
import { tierOf } from '@/shared/utils/tier'
import { useTopicLeaderboard } from '../hooks/use-topic'
import { formatNumber, tierLabel } from '../lib/format'
import { userAvatar } from '@/shared/utils/avatar'
import { t, useT } from '@/lib/i18n'

/** Rang à partir duquel la ligne du joueur passe en barre fixe (hors du top 10). */
export const BOARD_TOP = 10

export const boardSub = (entry: LeaderboardEntryView) => tierLabel(tierOf(entry.rating))

/** Ligne du joueur connecté, en barre fixe au-dessus de la barre d'onglets. */
export function MyBoardRow({
  entry,
  sub = t('topic.totalXp', { xp: formatNumber(entry.totalXp) }),
  trail = formatNumber(entry.totalXp),
}: {
  entry: LeaderboardEntryView
  sub?: string
  trail?: string
}) {
  const t = useT()
  const identity = usePlayerIdentity()
  return (
    <PlayerRow
      highlight
      last
      rank={entry.rank}
      name={entry.pseudonym}
      premium={identity.premium(entry)}
      onPress={identity.open(entry.userId)}
      src={userAvatar(entry)}
      tier={tierOf(entry.rating)}
      sub={sub}
      trail={trail}
    />
  )
}

/** Onglet Classement : Top 10 depuis toujours, podium puis rangs 4 à 10. */
export function BoardTab({
  topicId,
  topicName,
  rankingsPath,
  bottomInset,
}: {
  topicId: string
  topicName: string
  rankingsPath: '/home/rankings' | '/topics/rankings' | '/profile/rankings' | '/social/rankings'
  bottomInset: number
}) {
  const t = useT()
  const identity = usePlayerIdentity()
  const board = useTopicLeaderboard(topicId)
  const entries = board.data?.entries.content ?? []
  const [first, second, third, ...rest] = entries
  const podium = [first, second, third].filter((entry): entry is LeaderboardEntryView => entry !== undefined)

  return (
    <TabScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        gap: tokens.space[4],
        paddingHorizontal: tokens.space[5],
        paddingTop: tokens.space[2],
        paddingBottom: tokens.space[7] + bottomInset,
      }}
    >
      <SectionHeader
        title={t('topic.top10')}
        action={
          <Button variant="plain" size="S" onPress={() => router.push({ pathname: rankingsPath, params: { topicId, topicName, backLabel: t('pending.topic') } })}>
            {t('topic.allRankings')}
          </Button>
        }
      />
      <Text variant="caption" color="muted">
        {t('topic.boardLegend')}
      </Text>
      {board.isPending ? (
        <>
          <Skeleton shape="card" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </>
      ) : board.isError ? (
        <EmptyState
          icon={WarningCircleIcon}
          title={t('topic.boardError')}
          description={t('home.errorText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={board.isRefetching} onPress={() => void board.refetch()}>
              {t('callback.retry')}
            </Button>
          }
        />
      ) : entries.length === 0 ? (
        <EmptyState icon={TrophyIcon} title={t('mobile.topic.nobodyMonth')} description={t('topic.boardEmptyText')} />
      ) : (
        <>
          <Podium
            players={podium.map((entry) => ({
              name: entry.pseudonym,
              src: userAvatar(entry),
              tier: tierOf(entry.rating),
              value: formatNumber(entry.totalXp),
              premium: identity.premium(entry),
              onPress: identity.open(entry.userId),
            }))}
          />
          {rest.length > 0 && (
            <ListGroup surface="surface">
              {rest.map((entry, index) => (
                <PlayerRow
                  key={entry.userId}
                  rank={entry.rank}
                  name={entry.pseudonym}
                  premium={identity.premium(entry)}
                  onPress={identity.open(entry.userId)}
                  src={userAvatar(entry)}
                  tier={tierOf(entry.rating)}
                  sub={boardSub(entry)}
                  trail={formatNumber(entry.totalXp)}
                  highlight={entry.userId === board.data?.me?.userId}
                  last={index === rest.length - 1}
                />
              ))}
            </ListGroup>
          )}
        </>
      )}
    </TabScrollView>
  )
}
