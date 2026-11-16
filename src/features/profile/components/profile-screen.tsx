import { useQueryClient } from '@tanstack/react-query'
import { router } from '@/shared/navigation/router'
import { useMemo, useState } from 'react'
import { countryFlag, countryName } from '@joutio/client/geo'
import { ScrollView, View } from 'react-native'
import {
  Avatar,
  AVATAR_SIZES,
  HERO_HEIGHT,
  Badge,
  Button,
  CollapsibleTabsScreen,
  EmptyState,
  GearSixIcon,
  PencilSimpleIcon,
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
import { ProfileNotificationButton } from '@/features/notifications/components/profile-notification-button'
import { useMyTitles } from '@/features/topic/hooks/use-topic'
import { formatNumber, tierLabel } from '@/features/topic/lib/format'
import { useShare } from '@/features/share'
import { tierOf } from '@/shared/utils/tier'
import { useMyActivity, useMyBadges, useMyTopics } from '../hooks/use-profile'
import { badgesSummary, familiesOf, type BadgeFamilySummary } from '../lib/badges'
import { titleLabel } from '../lib/format'
import { streakHint, weekOf } from '../lib/streak'
import { BadgeFamilySheet, RanksSheet } from './profile-sheets'
import { BadgesTab, HistoryTab, StatsTab, TitlesTab } from './profile-tabs'
import { currentLanguage, useLanguage, useT } from '@/lib/i18n'

type Tab = 'stats' | 'badges' | 'titles' | 'history'

/**
 * Profil (`design/specs/screens/profil.md`) : bannière en parallaxe avec avatar et pseudonyme centrés, titre porté,
 * rang, pays et compteurs, puis onglets Statistiques, Badges, Titres et Historique. C'est un onglet : pas de retour.
 */
export function ProfileScreen() {
  const t = useT()
  const language = useLanguage()
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

  const families = useMemo(() => (badges.data ? familiesOf(badges.data, t, language) : undefined), [badges.data, t, language])
  const progression = data?.progression
  const rating = progression?.rating ?? 0
  const tier = progression ? tierOf(progression.rating) : undefined
  const worn = titles.data?.titles.find((title) => title.key === (titles.data?.equippedKey ?? data?.equippedTitle))
  const stats = data?.stats
  const name = data?.pseudonym ?? t('nav.profile')
  // Avant le `return` de l'erreur : le nombre de hooks ne doit pas dépendre du chargement (2026-11-14).
  const share = useShare()

  if (me.isError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: tokens.space[5] }}>
        <EmptyState
          icon={WarningCircleIcon}
          title={t('profile.error')}
          description={t('home.errorText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={me.isRefetching} onPress={() => void me.refetch()}>
              {t('callback.retry')}
            </Button>
          }
        />
      </View>
    )
  }

  const counters = [
    { label: t('topic.tabGames'), value: stats ? formatNumber(stats.played) : '—' },
    { label: t('topic.followers'), value: data ? formatNumber(data.followersCount) : '—' },
    { label: t('profile.following'), value: data ? formatNumber(data.followingCount) : '—' },
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
        eyebrow={data ? <Avatar name={name} src={avatar} tier={tier} size="xxl" /> : undefined}
        right={
          <>
            <ProfileNotificationButton />
            <ParallaxIconButton icon={GearSixIcon} label={t('profile.settings')} onPress={() => router.push('/profile/settings')} />
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
                  <Badge variant="tier" tier={tier}>{t('common.dotPair', { a: tierLabel(tier), b: formatNumber(rating) })}</Badge>
                ) : null}
                {data?.country && <Pill>{`${countryFlag(data.country)} ${countryName(data.country, currentLanguage())}`}</Pill>}
              </View>
            </View>
            {/* Même gabarit que Défier / Suivre de la Fiche joueur : 65 / 35, avant les compteurs (`profil.md` § 1). */}
            <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
              <Button full style={{ flex: 65 }} icon={PencilSimpleIcon} variant="tinted" disabled={!data} onPress={() => router.push('/edit-profile')}>
                {t('profile.edit')}
              </Button>
              <Button
                full
                style={{ flex: 35 }}
                icon={ShareNetworkIcon}
                variant="gray"
                disabled={!data}
                onPress={() => data && share({ kind: 'profile', id: data.userId, message: t('share.profileText'), title: t('share.profileTitle') })}
              >
                {t('profile.share')}
              </Button>
            </View>
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              {counters.map((counter) => (
                <Stat key={counter.label} {...counter} compact />
              ))}
            </View>
          </View>
        }
        tabsLabel={t('profile.tabs')}
        initialTab="stats"
        onTabChange={setTab}
        tabs={[
          {
            value: 'stats',
            label: t('profile.tabStats'),
            content: data ? (
              <StatsTab
                streak={activity.data ? { count: activity.data.currentStreak, hint: streakHint(activity.data), week: weekOf(activity.data) } : undefined}
                tier={tier}
                rating={rating}
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
            label: t('profile.tabBadges'),
            content: (
              <BadgesTab
                families={families}
                summary={badges.data ? badgesSummary(badges.data, t) : undefined}
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
            label: t('workshop.titles'),
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
            label: t('profile.tabHistory'),
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
