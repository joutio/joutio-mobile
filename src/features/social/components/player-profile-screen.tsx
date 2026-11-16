import { countryFlag, countryName } from '@joutio/client/geo'
import { useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import {
  Avatar,
  AVATAR_SIZES,
  Badge,
  Button,
  CheckIcon,
  Dialog,
  DotsThreeVerticalIcon,
  EmptyState,
  FlagIcon,
  HERO_HEIGHT,
  LightningIcon,
  ListGroup,
  MatchRow,
  Menu,
  OutcomeBar,
  ParallaxIconButton,
  ParallaxScreen,
  Pill,
  ProhibitIcon,
  SectionHeader,
  Skeleton,
  Stat,
  SwordIcon,
  Text,
  TitleRibbon,
  toast,
  toCategoryCode,
  tokens,
  useTheme,
  WarningCircleIcon,
  type MatchOutcome,
} from '@/design-system'
import { ReportPlayerSheet } from '@/features/duel/components/report-sheets'
import { useHistoryGames } from '@/features/history/hooks/use-history'
import { useMe, usePlayerIdentity } from '@/features/me'
import { useTopicOverview } from '@/features/topic/hooks/use-topic'
import { dayLabel, formatNumber, tierLabel } from '@/features/topic/lib/format'
import type { GameOutcome, PlayerCardView } from '@joutio/client/api-types'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import type { TierCode } from '@/design-system'
import { useFollowPlayer, useHeadToHead, usePlayerProfile } from '../hooks/use-social'
import { useBlockMocks, useIsBlocked } from '../lib/block-mocks'
import { presenceLine } from '../lib/presence'
import { ChallengePlayerSheet } from './challenge-player-sheet'
import { userAvatar } from '@/shared/utils/avatar'
import { confirmUnfollow } from '../lib/confirm-unfollow'
import { currentLanguage, useT } from '@/lib/i18n'

const GUTTER = tokens.space[5]
const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }
const outcomeOf = (outcome: GameOutcome) => OUTCOMES[outcome]

/** Lab : fond uni (pas de bannière) et squelettes, `gap-6 pt-1`. */
function Loading() {
  const t = useT()
  return (
    <View accessibilityLabel={t('home.loading')} style={{ gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
      <Skeleton shape="row" />
      <Skeleton shape="card" style={{ height: 120 }} />
    </View>
  )
}

/**
 * Fiche joueur (`fiche-joueur.md`) : bannière, avatar, titre porté, rang/Elo, pays et présence ; Défier/Suivre ;
 * bilan et dernières parties. Les actions de la barre compacte prennent le relais une fois l'intro repliée, comme
 * dans le lab.
 */
export function PlayerProfileScreen() {
  const t = useT()
  const identity = usePlayerIdentity()
  const params = useLocalSearchParams<{ id: string }>()
  const id = params.id ?? ''
  const me = useMe(true)
  const { colors, radius } = useTheme()
  const profile = usePlayerProfile(id)
  const client = useQueryClient()
  const follow = useFollowPlayer(id)
  const head = useHeadToHead(id)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const blocked = useIsBlocked(id)
  const setBlocked = useBlockMocks((state) => state.setBlocked)
  const data = profile.data
  const games = useHistoryGames(id, { opponentId: me.data?.userId ?? '', outcome: 'ALL', sort: 'RECENT' }, Boolean(id && me.data?.userId))

  // Le titre porté n'a que topicId:TIER : le nom du titre vient du sujet, comme dans le lab.
  const equipped = data?.equippedTitle?.split(':')
  const titleTopicId = equipped?.[0]
  const titleTier = equipped?.[1] as TierCode | undefined
  const titleOverview = useTopicOverview(titleTopicId ?? '', Boolean(titleTopicId))
  const titleText = titleTier ? (titleOverview.data?.titles?.fr?.[titleTier] ?? titleOverview.data?.topic.names?.fr ?? '') : ''

  const rating = data?.progression?.rating
  const tier = rating != null ? tierOf(rating) : undefined
  const canAct = Boolean(data && !data.isMe && !data.suspended && !blocked)
  const latest =
    games.data?.pages
      .flatMap((page) => page.content)
      .filter((game) => outcomeOf(game.outcome))
      .slice(0, 10) ?? []
  const stats = data?.stats
  const challengePlayer: PlayerCardView | null = data
    ? {
        userId: data.userId,
        pseudonym: data.pseudonym,
        avatarOptions: data.avatarOptions,
        rating: rating ?? 0,
        following: data.following,
        presence: data.presence,
        suspended: data.suspended,
      }
    : null
  const openHistory = () =>
    router.push({
      pathname: '/social/history',
      params: {
        userId: data?.userId ?? '',
        opponentId: me.data?.userId ?? '',
        opponentName: data?.pseudonym ?? '',
        backLabel: t('history.backPlayer'),
      },
    })
  const openResult = (game: (typeof latest)[number]) => {
    const outcome = outcomeOf(game.outcome)
    if (!outcome) return
    router.push({
      pathname: '/result/[gameId]',
      params: {
        gameId: game.gameId,
        topicName: topicName(game.topic.names),
        topicId: game.topic.topicId,
        category: game.topic.category ?? '',
      },
    })
  }

  const seen = data ? presenceLine(data.presence) : ''
  const played = (head.data?.played ?? 0) > 0

  const toggleFollow = () => {
    if (!data || follow.isPending) return
    if (!data.following) return follow.mutate(true)
    confirmUnfollow(data.pseudonym, () => follow.mutate(false))
  }

  // Mock (pas d'endpoint BFF) : le blocage retire aussi l'abonnement, qui, lui, est réel.
  const block = () => {
    if (!data) return
    setBlocked(data.userId, true)
    if (data.following) follow.mutate(false)
    toast.success(t('mobile.social.blocked', { name: data.pseudonym }))
  }
  const unblock = () => {
    if (!data) return
    setBlocked(data.userId, false)
    toast.success(t('mobile.social.unblocked', { name: data.pseudonym }))
  }

  return (
    <>
      <ParallaxScreen
        heroHeight={HERO_HEIGHT + AVATAR_SIZES.xxl - AVATAR_SIZES.xl}
        image={data?.bannerUrl ?? undefined}
        title={data?.pseudonym ?? t('history.backPlayer')}
        premium={identity.premium(data)}
        eyebrow={data ? <Avatar name={data.pseudonym} src={userAvatar(data)} tier={tier} size="xxl" /> : undefined}
        centered
        barTitleStart
        onBack={() => router.back()}
        onRefresh={() => client.refetchQueries({ type: 'active' })}
        right={
          data && !data.isMe ? (
            <>
              <Menu
                items={[
                  { label: t('player.report'), icon: FlagIcon, onPress: () => setReportOpen(true) },
                  ...(blocked ? [] : [{ label: t('mobile.social.block'), icon: ProhibitIcon, destructive: true, onPress: () => setBlockOpen(true) }]),
                ]}
              >
                {(open) => <ParallaxIconButton icon={DotsThreeVerticalIcon} label={t('player.more')} onPress={open} />}
              </Menu>
            </>
          ) : undefined
        }
        intro={
          data ? (
            <View style={{ gap: tokens.space[5] }}>
              <View style={{ alignItems: 'center', gap: tokens.space[3] }}>
                {titleText && titleTier && (
                  <ScrollView
                    horizontal
                    nestedScrollEnabled
                    directionalLockEnabled
                    scrollsToTop={false}
                    style={{ alignSelf: 'stretch', flexGrow: 0 }}
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <TitleRibbon tier={titleTier} text={titleText} width="auto" />
                  </ScrollView>
                )}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: tokens.space[3] }}>
                  {tier && <Badge variant="tier" tier={tier}>{t('common.dotPair', { a: tierLabel(tier), b: formatNumber(rating ?? 0) })}</Badge>}
                  {data.country && <Pill>{`${countryFlag(data.country)} ${countryName(data.country, currentLanguage())}`}</Pill>}
                  {data.suspended && <Pill tone="suspended">{t('onboarding.ended.suspendedTitle')}</Pill>}
                  {blocked && <Pill tone="wrong">{t('mobile.social.blockedBadge')}</Pill>}
                </View>
                {!data.suspended && !blocked && (
                  <Text variant="caption" color="muted">
                    {seen}
                  </Text>
                )}
              </View>
              {blocked && !data.isMe && (
                <Button full variant="gray" tone="neutral" onPress={unblock}>
                  {t('mobile.social.unblock')}
                </Button>
              )}
              {canAct && (
                // 65 / 35 : le défi est l'action principale, comme « Lancer un duel » sur la Fiche sujet.
                <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                  <Button full style={{ flex: 65 }} icon={LightningIcon} variant="filled" tone="accent" onPress={() => setChallengeOpen(true)}>
                    {t('player.challenge')}
                  </Button>
                  <Button
                    full
                    style={{ flex: 35 }}
                    icon={data.following ? CheckIcon : undefined}
                    variant={data.following ? 'gray' : 'tinted'}
                    tone={data.following ? 'neutral' : 'accent'}
                    accessibilityState={{ selected: data.following }}
                    loading={follow.isPending}
                    onPress={toggleFollow}
                  >
                    {data.following ? t('topic.followed') : t('topic.follow')}
                  </Button>
                </View>
              )}
            </View>
          ) : undefined
        }
      >
        {profile.isPending ? (
          <Loading />
        ) : profile.isError || !data ? (
          <View style={{ paddingHorizontal: GUTTER }}>
            <EmptyState
              icon={WarningCircleIcon}
              title={t('player.error')}
              description={t('home.errorText')}
              action={
                <Button style={{ alignSelf: 'center' }} loading={profile.isRefetching} onPress={() => void profile.refetch()}>
                  {t('callback.retry')}
                </Button>
              }
            />
          </View>
        ) : (
          <View style={{ gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[4], paddingBottom: tokens.space[8] }}>
            <View style={{ gap: tokens.space[3] }}>
              <SectionHeader title={t('player.headToHead', { name: data.pseudonym })} />
              {head.isPending ? (
                <Skeleton shape="card" style={{ height: 120 }} />
              ) : head.data && head.data.played > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                    <Stat label={t('profile.wins')} value={String(head.data.wins)} tone="up" compact />
                    <Stat label={t('profile.draw')} value={String(head.data.draws)} compact />
                    <Stat label={t('profile.losses')} value={String(head.data.losses)} tone="down" compact />
                  </View>
                  <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: tokens.space[4] }}>
                    <OutcomeBar wins={head.data.wins} draws={head.data.draws} losses={head.data.losses} />
                  </View>
                </>
              ) : (
                <EmptyState icon={SwordIcon} title={t('history.emptyPlayer')} description={t('player.noDuelText', { name: data.pseudonym })} />
              )}
            </View>
            {(head.isPending || played) && (
              <View style={{ gap: tokens.space[3] }}>
                <SectionHeader
                  title={t('topic.lastGames')}
                  action={
                    <Button variant="plain" size="S" onPress={openHistory}>
                      {t('home.seeAll')}
                    </Button>
                  }
                />
                {games.isPending ? (
                  <View style={{ gap: tokens.space[2] }}>
                    <Skeleton shape="row" />
                    <Skeleton shape="row" />
                    <Skeleton shape="row" />
                  </View>
                ) : latest.length === 0 ? (
                  <EmptyState icon={SwordIcon} title={t('history.empty')} description={t('mobile.social.noGameText')} />
                ) : (
                  <ListGroup surface="surface">
                    {latest.map((game, index) => {
                      const outcome = outcomeOf(game.outcome)
                      if (!outcome) return null
                      return (
                        <MatchRow
                          key={game.gameId}
                          topic={topicName(game.topic.names)}
                          category={toCategoryCode(game.topic.category)}
                          pictogram={game.topic.pictogramUrl ?? undefined}
                          image={game.topic.imageUrl ?? undefined}
                          sub={dayLabel(new Date(game.playedAt))}
                          outcome={outcome}
                          score={`${game.myScore} · ${game.opponentScore}`}
                          bot={game.opponentType === 'BOT'}
                          last={index === latest.length - 1}
                          onPress={() => openResult(game)}
                        />
                      )
                    })}
                  </ListGroup>
                )}
              </View>
            )}
          </View>
        )}
      </ParallaxScreen>
      <ChallengePlayerSheet player={challengeOpen ? challengePlayer : null} onClose={() => setChallengeOpen(false)} />
      {data && !data.isMe && (
        <ReportPlayerSheet
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          userId={data.userId}
          name={data.pseudonym}
          subtitle={t('mobile.social.playerCard')}
          onBlock={blocked ? undefined : () => setBlockOpen(true)}
        />
      )}
      {data && (
        <Dialog
          open={blockOpen}
          onClose={() => setBlockOpen(false)}
          sheet
          tone="danger"
          icon={ProhibitIcon}
          title={t('mobile.social.blockTitle', { name: data.pseudonym })}
          message={t('mobile.social.blockText')}
          actions={[
            { label: t('mobile.social.block'), variant: 'tinted', tone: 'destructive', onPress: block },
            { label: t('topic.cancel'), variant: 'plain', tone: 'neutral' },
          ]}
        />
      )}
    </>
  )
}
