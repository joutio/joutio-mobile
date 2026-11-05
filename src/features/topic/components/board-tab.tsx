import { router } from 'expo-router'
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
import type { LeaderboardEntryView } from '@/shared/types/bff'
import { tierOf } from '@/shared/utils/tier'
import { useTopicLeaderboard } from '../hooks/use-topic'
import { formatNumber, monthlyLegend, tierLabel } from '../lib/format'

/** Rang à partir duquel la ligne du joueur passe en barre fixe (hors du top 10). */
export const BOARD_TOP = 10

export const boardSub = (entry: LeaderboardEntryView) => (entry.provisional ? 'Classement provisoire' : tierLabel(tierOf(entry.rating)))

/** Ligne du joueur connecté, en barre fixe au-dessus de la barre d'onglets. */
export function MyBoardRow({
  entry,
  sub = `${formatNumber(entry.monthlyXp)} XP ce mois`,
  trail = formatNumber(entry.monthlyXp),
}: {
  entry: LeaderboardEntryView
  sub?: string
  trail?: string
}) {
  return (
    <PlayerRow highlight last rank={entry.rank} name={entry.pseudonym} tier={entry.provisional ? undefined : tierOf(entry.rating)} sub={sub} trail={trail} />
  )
}

/** Onglet Classement : Top 10 du mois, podium puis rangs 4 à 10. */
export function BoardTab({
  topicId,
  topicName,
  rankingsPath,
  bottomInset,
}: {
  topicId: string
  topicName: string
  rankingsPath: '/home/rankings' | '/topics/rankings'
  bottomInset: number
}) {
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
        title="Top 10"
        action={
          <Button variant="plain" size="S" onPress={() => router.push({ pathname: rankingsPath, params: { topicId, topicName, backLabel: 'Sujet' } })}>
            Tous les classements
          </Button>
        }
      />
      <Text variant="caption" color="muted">
        {monthlyLegend()}
      </Text>
      {board.isPending ? (
        <>
          <Skeleton shape="card" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </>
      ) : board.isError && !board.data ? (
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger le classement"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={board.isRefetching} onPress={() => void board.refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : entries.length === 0 ? (
        <EmptyState icon={TrophyIcon} title="Personne n'a encore joué ce mois-ci" description="Lance un duel pour ouvrir le classement." />
      ) : (
        <>
          <Podium
            players={podium.map((entry) => ({
              name: entry.pseudonym,
              tier: entry.provisional ? undefined : tierOf(entry.rating),
              value: formatNumber(entry.monthlyXp),
            }))}
          />
          {rest.length > 0 && (
            <ListGroup surface="surface">
              {rest.map((entry, index) => (
                <PlayerRow
                  key={entry.userId}
                  rank={entry.rank}
                  name={entry.pseudonym}
                  tier={entry.provisional ? undefined : tierOf(entry.rating)}
                  sub={boardSub(entry)}
                  trail={formatNumber(entry.monthlyXp)}
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
