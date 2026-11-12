import { NotificationButton } from '@/features/notifications/components/notification-button'
import { router } from 'expo-router'
import { useState } from 'react'
import { Share, View } from 'react-native'
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
import { useMe, usePlayerIdentity } from '@/features/me'
import { useContacts } from '@/features/play/hooks/use-play'
import { formatNumber } from '@/features/topic/lib/format'
import type { PeopleSort, PlayerCardView } from '@joutio/client-domain/api-types'
import { tierOf } from '@/shared/utils/tier'
import { useMyProfile } from '../hooks/use-social'
import { presenceOf, presenceSub } from '../lib/presence'
import { ChallengePlayerSheet } from './challenge-player-sheet'
import { SocialSortSheet, SOCIAL_SORTS } from './social-sort-sheet'
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
  sort,
  onSort,
}: {
  list: ReturnType<typeof useContacts>
  direction: Direction
  query: string
  onOpen: (player: PlayerCardView) => void
  onChallenge: (player: PlayerCardView) => void
  onInvite: () => void
  sort: PeopleSort
  onSort: () => void
}) {
  const identity = usePlayerIdentity()
  const players = list.data?.pages.flatMap((page) => page.content) ?? []
  const emptyTitle = query
    ? direction === 'following'
      ? 'Aucun Abonnement trouvé'
      : 'Aucun Abonné trouvé'
    : direction === 'following'
      ? "Tu ne suis personne pour l'instant"
      : "Tu n'as pas encore d'abonné"
  const emptyDescription = query
    ? 'Vérifie le pseudonyme ou essaie un autre mot.'
    : direction === 'following'
      ? 'Suis les joueurs croisés en duel pour les défier en un geste et voir leurs résultats.'
      : 'Invite un ami ou joue des duels pour te faire connaître.'

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
              ? `${formatNumber(list.data.pages[0]?.totalElements ?? 0)} ${direction === 'following' ? 'abonnement' : 'abonné'}${(list.data.pages[0]?.totalElements ?? 0) > 1 ? 's' : ''}`
              : '…'}
          </Text>
          <Chip icon={ArrowsDownUpIcon} onPress={onSort}>
            {SOCIAL_SORTS.find((option) => option.value === sort)?.label ?? 'Présence'}
          </Chip>
        </View>
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
                query.trim() ? (
                  <Button full icon={MagnifyingGlassIcon} onPress={() => router.push({ pathname: '/social/search', params: { q: query.trim() } })}>
                    Rechercher globalement
                  </Button>
                ) : (
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
                  premium={identity.premium(player)}
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

  return (
    <Screen
      inTabs
      scroll={false}
      header={
        <SearchHeader
          title="Social"
          value={query}
          onChange={setQuery}
          placeholder="Chercher un joueur"
          filterLabel="Trier les contacts"
          filterDot={sort !== 'PRESENCE'}
          onFilter={() => setSortOpen(true)}
          notifications={<NotificationButton />}
        />
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
            label: 'Abonnements',
            content: (
              <PeopleList
                list={following}
                direction="following"
                query={query}
                onOpen={openPlayer}
                onChallenge={setChallenged}
                onInvite={invite}
                sort={sort}
                onSort={() => setSortOpen(true)}
              />
            ),
          },
          {
            value: 'followers',
            label: 'Abonnés',
            content: (
              <PeopleList
                list={followers}
                direction="followers"
                query={query}
                onOpen={openPlayer}
                onChallenge={setChallenged}
                onInvite={invite}
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
