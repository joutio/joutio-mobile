import { router } from 'expo-router'
import { useState } from 'react'
import { Share, View } from 'react-native'
import {
  BellIcon,
  Button,
  DragToLoadMore,
  EmptyState,
  FeedFooter,
  IconButton,
  ListGroup,
  MagnifyingGlassIcon,
  MobileTopBar,
  PlayerRow,
  Screen,
  SearchField,
  Skeleton,
  SlidersHorizontalIcon,
  SwordIcon,
  TabLoadMoreScrollView,
  TabsScrollView,
  tokens,
  UsersThreeIcon,
  WarningCircleIcon,
} from '@/design-system'
import { useMe } from '@/features/me'
import { useUnreadCount } from '@/features/home'
import { useContacts } from '@/features/play/hooks/use-play'
import { formatNumber } from '@/features/topic/lib/format'
import type { PeopleSort, PlayerCardView } from '@/shared/types/bff'
import { tierOf } from '@/shared/utils/tier'
import { useMyProfile } from '../hooks/use-social'
import { presenceOf, presenceSub } from '../lib/presence'
import { ChallengePlayerSheet } from './challenge-player-sheet'
import { SocialSortSheet } from './social-sort-sheet'
import { userAvatar } from '@/shared/utils/avatar'
import { feedFooterProps, pagedQuery } from '@/shared/utils/paging'

const GUTTER = tokens.space[5]

type Direction = 'following' | 'followers'

/** Ligne de contact : la ligne ouvre la fiche, l'épée ouvre le choix du sujet. */
function PeopleList({
  list,
  direction,
  query,
  onOpen,
  onChallenge,
  onInvite,
}: {
  list: ReturnType<typeof useContacts>
  direction: Direction
  query: string
  onOpen: (player: PlayerCardView) => void
  onChallenge: (player: PlayerCardView) => void
  onInvite: () => void
}) {
  const players = list.data?.pages.flatMap((page) => page.content) ?? []
  const emptyTitle = query ? 'Aucun joueur trouvé' : direction === 'following' ? "Tu ne suis personne pour l'instant" : "Tu n'as pas encore d'abonné"
  const emptyDescription = query
    ? 'Vérifie le pseudonyme ou essaie un autre mot.'
    : direction === 'following'
      ? 'Suis les joueurs croisés en duel pour les défier en un geste et voir leurs résultats.'
      : 'Invite un ami ou joue des duels pour te faire connaître.'

  return (
    <DragToLoadMore
      enabled={Boolean(list.hasNextPage) && !list.isFetchNextPageError}
      loading={list.isFetchingNextPage}
      onLoadMore={() => void list.fetchNextPage()}
    >
      <TabLoadMoreScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}>
        {list.isPending ? (
          <View accessibilityLabel="Chargement" style={{ gap: tokens.space[3], paddingHorizontal: GUTTER }}>
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} shape="row" style={{ height: 64 }} />
            ))}
          </View>
        ) : list.isError ? (
          <View style={{ paddingHorizontal: GUTTER }}>
            <EmptyState
              icon={WarningCircleIcon}
              title="Impossible de charger tes contacts"
              description="Vérifie ta connexion, puis réessaie."
              action={
                <Button style={{ alignSelf: 'center' }} loading={list.isRefetching} onPress={() => void list.refetch()}>
                  Réessayer
                </Button>
              }
            />
          </View>
        ) : players.length === 0 ? (
          <View style={{ paddingHorizontal: GUTTER }}>
            {/* Recherche sans résultat : pas d'action (lab). Liste vide : « Inviter un ami » en action principale. */}
            <EmptyState
              icon={query ? MagnifyingGlassIcon : UsersThreeIcon}
              title={emptyTitle}
              description={emptyDescription}
              action={
                query ? undefined : (
                  <Button full onPress={onInvite}>
                    Inviter un ami
                  </Button>
                )
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
                  src={userAvatar(player)}
                  tier={player.provisional ? undefined : tierOf(player.rating)}
                  presence={presenceOf(player.presence)}
                  sub={presenceSub(player.presence)}
                  last={index === players.length - 1}
                  ctaIcon={{ icon: SwordIcon, label: 'Défier', onPress: () => onChallenge(player) }}
                  onPress={() => onOpen(player)}
                />
              ))}
            </ListGroup>
            <FeedFooter
              // Espace au-dessus du filet du pied (et non sous lui) : il ne colle pas à la liste.
              style={{ marginTop: tokens.space[4] }}
              {...feedFooterProps(pagedQuery(list))}
              endLabel="Tu as vu tous les joueurs"
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
  const me = useMe(true)
  const myProfile = useMyProfile(true)
  const unread = useUnreadCount()
  const [tab, setTab] = useState<Direction>('following')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<PeopleSort>('PRESENCE')
  const [sortOpen, setSortOpen] = useState(false)
  const [challenged, setChallenged] = useState<PlayerCardView | null>(null)

  const following = useContacts('following', query, true, sort)
  const followers = useContacts('followers', query, true, sort)

  const invite = () => {
    void Share.share({ message: `${me.data?.pseudonym ?? 'Un joueur'} t’invite sur Joutio : https://joutio.com` })
  }
  const openPlayer = (player: PlayerCardView) => {
    router.push({ pathname: '/social/player/[id]', params: { id: player.userId } })
  }
  const label = (name: string, count: number | undefined) => (count === undefined ? name : `${name} · ${formatNumber(count)}`)

  return (
    <Screen
      inTabs
      scroll={false}
      header={
        <View>
          <MobileTopBar
            title="Social"
            right={
              <IconButton
                icon={BellIcon}
                label="Notifications"
                variant="plain"
                tone="neutral"
                badge={unread.data?.count ? 'dot' : undefined}
                onPress={() => router.push('/home/notifications')}
              />
            }
          />
          {/* Lab : `pt-1`, puis `gap-3` jusqu'au `Segmented` (qui porte déjà 9 pt au-dessus de lui). */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: tokens.space[3],
              paddingHorizontal: GUTTER,
              paddingTop: tokens.space[2],
              paddingBottom: tokens.space[4] - (tokens.space[3] + 1),
            }}
          >
            <View style={{ flex: 1 }}>
              <SearchField value={query} onChange={setQuery} placeholder="Chercher un joueur" label="Chercher un joueur" />
            </View>
            <IconButton
              icon={SlidersHorizontalIcon}
              label="Trier les contacts"
              variant="gray"
              tone="neutral"
              badge={sort === 'PRESENCE' ? undefined : 'dot'}
              onPress={() => setSortOpen(true)}
            />
          </View>
        </View>
      }
    >
      <TabsScrollView
        label="Contacts"
        value={tab}
        onChange={setTab}
        onRefresh={() => Promise.all([following.refetch(), followers.refetch(), myProfile.refetch()])}
        pages={[
          {
            value: 'following',
            label: label('Abonnements', myProfile.data?.followingCount),
            content: <PeopleList list={following} direction="following" query={query} onOpen={openPlayer} onChallenge={setChallenged} onInvite={invite} />,
          },
          {
            value: 'followers',
            label: label('Abonnés', myProfile.data?.followersCount),
            content: <PeopleList list={followers} direction="followers" query={query} onOpen={openPlayer} onChallenge={setChallenged} onInvite={invite} />,
          },
        ]}
      />
      <SocialSortSheet open={sortOpen} onClose={() => setSortOpen(false)} value={sort} onChange={setSort} />
      <ChallengePlayerSheet player={challenged} onClose={() => setChallenged(null)} />
    </Screen>
  )
}
