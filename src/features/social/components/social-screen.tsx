import { NotificationButton } from '@/features/notifications/components/notification-button'
import { SettingsButton } from '@/features/settings/components/settings-button'
import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  Chip,
  ArrowsDownUpIcon,
  Text,
  DragToLoadMore,
  EmptyState,
  FeedFooter,
  ListGroup,
  MagnifyingGlassIcon,
  PlayerRow,
  Screen,
  SearchHeader,
  Skeleton,
  SwordIcon,
  TabLoadMoreScrollView,
  TabsScrollView,
  tokens,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@/design-system'
import { usePlayerIdentity } from '@/features/me'
import { useContacts } from '@joutio/client/social'
import { useSessionUserId } from '@/features/auth'
import { formatNumber } from '@/features/topic/lib/format'
import type { PeopleSort, PlayerCardView } from '@joutio/client/profile'
import { tierOf } from '@/shared/utils/tier'
import { useMyProfile } from '../hooks/use-social'
import { presenceOf, presenceSub } from '../lib/presence'
import { ChallengePlayerSheet } from './challenge-player-sheet'
import { SocialSortSheet, SOCIAL_SORTS } from './social-sort-sheet'
import { userAvatar } from '@/shared/utils/avatar'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'
import { useT } from '@/lib/i18n'

const GUTTER = tokens.space[5]

type Direction = 'following' | 'followers'

/** Ligne de contact : la ligne ouvre la fiche, l'épée ouvre le choix du sujet. */
function PeopleList({
  list,
  direction,
  query,
  onOpen,
  onChallenge,
  sort,
  onSort,
}: {
  list: ReturnType<typeof useContacts>
  direction: Direction
  query: string
  onOpen: (player: PlayerCardView) => void
  onChallenge: (player: PlayerCardView) => void
  sort: PeopleSort
  onSort: () => void
}) {
  const t = useT()
  const identity = usePlayerIdentity()
  const players = (list.data?.pages ?? []).flatMap((page) => page.content)
  const emptyTitle = query
    ? direction === 'following'
      ? t('mobile.social.noFollowingFound')
      : t('mobile.social.noFollowerFound')
    : direction === 'following'
      ? t('social.followingEmptyTitle')
      : t('social.followersEmptyTitle')
  const emptyDescription = query ? t('play.noPlayerText') : direction === 'following' ? t('social.followingEmptyText') : t('social.followersEmptyText')

  return (
    <DragToLoadMore enabled={Boolean(list.hasNextPage) && !list.isFetchNextPageError} loading={list.isFetchingNextPage} onLoadMore={() => list.fetchNextPage()}>
      <TabLoadMoreScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: tokens.space[3],
            paddingHorizontal: GUTTER,
            paddingBottom: tokens.space[4],
          }}
        >
          <Text variant="callout" color="muted">
            {list.data
              ? (() => {
                  const total = (list.data?.pages ?? [])[0]?.totalElements ?? 0
                  const many = total > 1
                  const key =
                    direction === 'following' ? (many ? 'social.followingMany' : 'social.followingOne') : many ? 'social.followerMany' : 'social.followerOne'
                  return t(key, { count: formatNumber(total) })
                })()
              : '…'}
          </Text>
          <Chip icon={ArrowsDownUpIcon} onPress={onSort}>
            {SOCIAL_SORTS().find((option) => option.value === sort)?.label ?? t('social.sortPresence')}
          </Chip>
        </View>
        {list.isPending ? (
          <View accessibilityLabel={t('home.loading')} style={{ gap: tokens.space[3], paddingHorizontal: GUTTER }}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} shape="row" style={{ height: 64 }} />
            ))}
          </View>
        ) : list.isError ? (
          <View style={{ paddingHorizontal: GUTTER }}>
            <EmptyState
              icon={WarningCircleIcon}
              title={t('mobile.social.loadFailed')}
              description={t('home.errorText')}
              action={
                <Button style={{ alignSelf: 'center' }} loading={list.isRefetching} onPress={() => void list.refetch()}>
                  {t('callback.retry')}
                </Button>
              }
            />
          </View>
        ) : players.length === 0 ? (
          <View style={{ paddingHorizontal: GUTTER }}>
            {/* Recherche sans résultat : « Rechercher globalement » ; liste vide : pas d'action. */}
            <EmptyState
              icon={query ? MagnifyingGlassIcon : UsersThreeIcon}
              title={emptyTitle}
              description={emptyDescription}
              action={
                query.trim() ? (
                  <Button full icon={MagnifyingGlassIcon} onPress={() => router.push({ pathname: '/social/search', params: { q: query.trim() } })}>
                    {t('mobile.social.globalSearch')}
                  </Button>
                ) : undefined
              }
            />
          </View>
        ) : (
          <View style={{ paddingHorizontal: GUTTER }}>
            <ListGroup surface="surface">
              {players.map((player, index) => (
                <PlayerRow
                  key={player.userId}
                  name={player.pseudonym}
                  premium={identity.premium(player)}
                  src={userAvatar(player)}
                  tier={tierOf(player.rating)}
                  presence={presenceOf(player.presence)}
                  sub={presenceSub(player.presence)}
                  last={index === players.length - 1}
                  ctaIcon={{ icon: SwordIcon, label: t('player.challenge'), onPress: () => onChallenge(player) }}
                  onPress={() => onOpen(player)}
                />
              ))}
            </ListGroup>
            <FeedFooter
              // Espace au-dessus du filet du pied (et non sous lui) : il ne colle pas à la liste.
              style={{ marginTop: tokens.space[4] }}
              {...feedFooterProps(pagedQuery(list))}
              endLabel={t('play.playersEnd')}
            />
          </View>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )
}

/**
 * Annuaire Social (`social.md`) : abonnements / abonnés, recherche, tri et défi. La ligne ouvre la fiche du joueur,
 * l'épée ouvre le choix du sujet ; on suit depuis la fiche, pas depuis la liste.
 */
export function SocialScreen() {
  const t = useT()
  const myProfile = useMyProfile(true)
  const [tab, setTab] = useState<Direction>('following')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<PeopleSort>('PRESENCE')
  const [sortOpen, setSortOpen] = useState(false)
  const [challenged, setChallenged] = useState<PlayerCardView | null>(null)

  const userId = useSessionUserId()
  const following = useContacts({ userId, direction: 'following', query, sort })
  const followers = useContacts({ userId, direction: 'followers', query, sort })

  const openPlayer = (player: PlayerCardView) => {
    router.push({ pathname: '/social/player/[id]', params: { id: player.userId } })
  }

  return (
    <Screen
      inTabs
      scroll={false}
      header={
        <SearchHeader
          title={t('nav.social')}
          value={query}
          onChange={setQuery}
          placeholder={t('play.searchPlayer')}
          filterLabel={t('mobile.social.sortContacts')}
          filterDot={sort !== 'PRESENCE'}
          onFilter={() => setSortOpen(true)}
          notifications={
            <>
              <NotificationButton />
              <SettingsButton />
            </>
          }
        />
      }
    >
      <TabsScrollView
        label={t('play.contacts')}
        value={tab}
        onChange={setTab}
        onRefresh={() => Promise.all([following.refetch(), followers.refetch(), myProfile.refetch()])}
        pages={[
          {
            value: 'following',
            label: t('profile.following'),
            content: (
              <PeopleList
                list={following}
                direction="following"
                query={query}
                onOpen={openPlayer}
                onChallenge={setChallenged}
                sort={sort}
                onSort={() => setSortOpen(true)}
              />
            ),
          },
          {
            value: 'followers',
            label: t('topic.followers'),
            content: (
              <PeopleList
                list={followers}
                direction="followers"
                query={query}
                onOpen={openPlayer}
                onChallenge={setChallenged}
                sort={sort}
                onSort={() => setSortOpen(true)}
              />
            ),
          },
        ]}
      />
      <SocialSortSheet open={sortOpen} onClose={() => setSortOpen(false)} value={sort} onChange={setSort} />
      <ChallengePlayerSheet player={challenged} onClose={() => setChallenged(null)} />
    </Screen>
  )
}
