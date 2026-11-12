import { useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { ScrollView, Share, View } from 'react-native'
import {
  Avatar,
  AVATAR_SIZES,
  HERO_HEIGHT,
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
import { useHistoryGames } from '@/features/history/hooks/use-history'
import { DEFAULT_HISTORY_FILTERS } from '@/features/history/lib/history-service'
import { useMe } from '@/features/me'
import { useMyTitles } from '@/features/topic/hooks/use-topic'
import { formatNumber, tierLabel } from '@/features/topic/lib/format'
import { countryLabel } from '@/shared/utils/country'
import { tierOf } from '@/shared/utils/tier'
import { useMyActivity, useMyBadges, useMyTopics } from '../hooks/use-profile'
import { badgesSummary, familiesOf, type BadgeFamilySummary } from '../lib/badges'
import { titleLabel } from '../lib/format'
import { streakHint, weekOf } from '../lib/streak'
import { BadgeFamilySheet, RanksSheet } from './profile-sheets'
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
  const titles = useMyTitles()
  const games = useHistoryGames(userId, DEFAULT_HISTORY_FILTERS)
  const avatar = useMyAvatar()
  const [tab, setTab] = useState<Tab>('stats')
  const [ranksOpen, setRanksOpen] = useState(false)
  const [family, setFamily] = useState<BadgeFamilySummary>()
  const [familyOpen, setFamilyOpen] = useState(false)

  const families = useMemo(() => (badges.data ? familiesOf(badges.data) : undefined), [badges.data])
  const progression = data?.progression
  const rating = progression?.rating ?? 0
  const tier = progression && !progression.provisional ? tierOf(progression.rating) : undefined
  const worn = titles.data?.titles.find((title) => title.key === (titles.data?.equippedKey ?? data?.equippedTitle))
  const stats = data?.stats
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
        heroHeight={HERO_HEIGHT + AVATAR_SIZES.xxl - AVATAR_SIZES.xl}
        back={false}
        centered
        image={data?.bannerUrl ?? undefined}
        title={name}
        premium={data?.premium === true}
        eyebrow={data ? <Avatar name={name} src={avatar} tier={tier} provisional={progression?.provisional} size="xxl" /> : undefined}
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
              {worn && (
                <ScrollView
                  horizontal
                  nestedScrollEnabled
                  directionalLockEnabled
                  scrollsToTop={false}
                  style={{ alignSelf: 'stretch', flexGrow: 0 }}
                  contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                >
                  <TitleRibbon tier={worn.tier} text={titleLabel(worn)} width="auto" />
                </ScrollView>
              )}
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
                tier={tier}
                rating={rating}
                provisional={progression?.provisional ?? true}
                wins={stats?.wins ?? 0}
                draws={stats?.draws ?? 0}
                losses={stats?.losses ?? 0}
                topics={topics.data}
                active={tab === 'stats'}
                onStreak={() => router.push('/profile/streak')}
                onRanks={() => setRanksOpen(true)}
                onPlayed={() => router.push('/profile/played')}
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
        // Tout ce que la page affiche (profil, statistiques, badges, titres, historique), pas seulement l'en-tête.
        onRefresh={() => client.refetchQueries({ type: 'active' })}
      />
      <RanksSheet open={ranksOpen} onClose={() => setRanksOpen(false)} name={name} avatar={avatar} tier={tier} />
      <BadgeFamilySheet open={familyOpen} family={family} onClose={() => setFamilyOpen(false)} />
    </>
  )
}
