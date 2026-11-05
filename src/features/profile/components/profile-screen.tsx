import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Share, View } from 'react-native'
import {
  Avatar,
  Badge,
  Button,
  CollapsibleTabsScreen,
  EmptyState,
  GearSixIcon,
  MapPinIcon,
  ParallaxIconButton,
  Pill,
  ShareNetworkIcon,
  Skeleton,
  Stat,
  TabSkeleton,
  TitleRibbon,
  tokens,
  WarningCircleIcon,
} from '@/design-system'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { avatarStylesFor } from '@/features/avatar/lib/avatar-styles'
import { useHistoryGames } from '@/features/history/hooks/use-history'
import { DEFAULT_HISTORY_FILTERS } from '@/features/history/lib/history-service'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useMyTitles } from '@/features/topic/hooks/use-topic'
import { formatNumber, tierLabel } from '@/features/topic/lib/format'
import { queryKeys } from '@/lib/query-keys'
import { countryLabel } from '@/shared/utils/country'
import { tierOf } from '@/shared/utils/tier'
import { useMyActivity, useMyBadges, useMyRewards, useMyTopics } from '../hooks/use-profile'
import { badgesSummary, familiesOf, type BadgeFamilySummary } from '../lib/badges'
import { titleLabel } from '../lib/format'
import { streakHint, weekOf } from '../lib/streak'
import { BadgeFamilySheet, MasterySheet, RanksSheet } from './profile-sheets'
import { BadgesTab, HistoryTab, StatsTab, TitlesTab } from './profile-tabs'

type Tab = 'stats' | 'badges' | 'titles' | 'history'

/**
 * Profil (`design/specs/screens/profil.md`) : bannière en parallaxe avec avatar et pseudonyme centrés, titre porté,
 * rang, pays et compteurs, puis onglets Statistiques, Badges, Titres et Historique. C'est un onglet : pas de retour.
 */
export function ProfileScreen() {
  const client = useQueryClient()
  const me = useMe(true)
  const data = me.data
  const userId = data?.userId ?? ''
  const badges = useMyBadges()
  const activity = useMyActivity()
  const topics = useMyTopics()
  const rewards = useMyRewards()
  const titles = useMyTitles()
  const games = useHistoryGames(userId, DEFAULT_HISTORY_FILTERS)
  const showPremium = usePremiumSheet((state) => state.show)
  const avatar = useMyAvatar()
  const [tab, setTab] = useState<Tab>('stats')
  const [ranksOpen, setRanksOpen] = useState(false)
  const [masteryOpen, setMasteryOpen] = useState(false)
  const [family, setFamily] = useState<BadgeFamilySummary>()
  const [familyOpen, setFamilyOpen] = useState(false)

  const families = useMemo(() => (badges.data ? familiesOf(badges.data) : undefined), [badges.data])
  const progression = data?.progression
  const rating = progression?.rating ?? 0
  const tier = progression && !progression.provisional ? tierOf(progression.rating) : undefined
  const worn = titles.data?.titles.find((title) => title.key === (titles.data?.equippedKey ?? data?.equippedTitle))
  const stats = data?.stats
  const styles = useMemo(() => avatarStylesFor(data, rewards.data, badges.data), [data, rewards.data, badges.data])
  const name = data?.pseudonym ?? 'Profil'

  if (me.isError && !data) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: tokens.space[5] }}>
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger ton profil"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={me.isRefetching} onPress={() => void me.refetch()}>
              Réessayer
            </Button>
          }
        />
      </View>
    )
  }

  const counters = [
    { label: 'Parties', value: stats ? formatNumber(stats.played) : '—' },
    { label: 'Abonnés', value: data ? formatNumber(data.followersCount) : '—' },
    { label: 'Abonnements', value: data ? formatNumber(data.followingCount) : '—' },
  ]

  return (
    <>
      <CollapsibleTabsScreen<Tab>
        back={false}
        centered
        image={data?.bannerUrl ?? undefined}
        title={name}
        eyebrow={data ? <Avatar name={name} src={avatar} tier={tier} provisional={progression?.provisional} size="xl" /> : undefined}
        right={
          <>
            <ParallaxIconButton
              icon={ShareNetworkIcon}
              label="Partager mon profil"
              onPress={() => void Share.share({ message: `${name} sur Joutio : viens me défier !` })}
            />
            <ParallaxIconButton icon={GearSixIcon} label="Réglages" onPress={() => router.push('/profile/settings')} />
          </>
        }
        intro={
          <View style={{ gap: tokens.space[5] }}>
            <View style={{ alignItems: 'center', gap: tokens.space[3] }}>
              {worn && <TitleRibbon tier={worn.tier} text={titleLabel(worn)} width={200} />}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: tokens.space[3] }}>
                {!data ? (
                  <Skeleton shape="row" style={{ width: 160 }} />
                ) : tier ? (
                  <Badge variant="tier" tier={tier}>{`${tierLabel(tier)} · ${formatNumber(rating)}`}</Badge>
                ) : (
                  <Pill>Non classé</Pill>
                )}
                {data?.country && <Pill icon={MapPinIcon}>{countryLabel(data.country)}</Pill>}
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              {counters.map((counter) => (
                <Stat key={counter.label} {...counter} compact />
              ))}
            </View>
          </View>
        }
        tabsLabel="Contenu du profil"
        initialTab="stats"
        onTabChange={setTab}
        tabs={[
          {
            value: 'stats',
            label: 'Statistiques',
            content: data ? (
              <StatsTab
                streak={activity.data ? { count: activity.data.currentStreak, hint: streakHint(activity.data), week: weekOf(activity.data) } : undefined}
                rewards={`${styles.filter((style) => style.usable).length} / ${styles.length}`}
                tier={tier}
                rating={rating}
                provisional={progression?.provisional ?? true}
                wins={stats?.wins ?? 0}
                draws={stats?.draws ?? 0}
                losses={stats?.losses ?? 0}
                topics={topics.data}
                active={tab === 'stats'}
                onStreak={() => router.push('/profile/streak')}
                onRewards={() => router.push('/profile/rewards')}
                onRanks={() => setRanksOpen(true)}
                onMastery={() => setMasteryOpen(true)}
              />
            ) : (
              <TabSkeleton />
            ),
          },
          {
            value: 'badges',
            label: 'Badges',
            content: (
              <BadgesTab
                families={families}
                summary={badges.data ? badgesSummary(badges.data) : undefined}
                loading={badges.isPending}
                error={badges.isError}
                retrying={badges.isRefetching}
                onRetry={() => void badges.refetch()}
                onOpen={(next) => {
                  setFamily(next)
                  setFamilyOpen(true)
                }}
              />
            ),
          },
          {
            value: 'titles',
            label: 'Titres',
            content: (
              <TitlesTab
                titles={titles.data?.titles}
                equippedKey={titles.data?.equippedKey}
                loading={titles.isPending}
                error={titles.isError}
                retrying={titles.isRefetching}
                onRetry={() => void titles.refetch()}
                onAll={() => router.push('/profile/titles')}
              />
            ),
          },
          {
            value: 'history',
            label: 'Historique',
            content: (
              <HistoryTab
                games={games.data?.pages[0]?.content}
                loading={games.isPending}
                error={games.isError}
                retrying={games.isRefetching}
                onRetry={() => void games.refetch()}
              />
            ),
          },
        ]}
        onRefresh={() =>
          Promise.all([
            client.refetchQueries({ queryKey: queryKeys.me() }),
            client.refetchQueries({ queryKey: ['profiles', userId] }),
            client.refetchQueries({ queryKey: queryKeys.rewards() }),
          ])
        }
      />
      <RanksSheet open={ranksOpen} onClose={() => setRanksOpen(false)} name={name} tier={tier} />
      <MasterySheet
        open={masteryOpen}
        onClose={() => setMasteryOpen(false)}
        topics={topics.data ?? []}
        onPremium={() => {
          setMasteryOpen(false)
          showPremium()
        }}
      />
      <BadgeFamilySheet open={familyOpen} family={family} onClose={() => setFamilyOpen(false)} />
    </>
  )
}
