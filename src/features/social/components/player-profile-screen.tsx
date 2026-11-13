import { countryFlag, countryName } from '@joutio/client-domain/geo'
import { useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Avatar,
  AVATAR_SIZES,
  Badge,
  Button,
  CheckIcon,
  Dialog,
  DotsThreeIcon,
  EmptyState,
  FlagIcon,
  HERO_HEIGHT,
  HeartIcon,
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
  TOP_BAR_HEIGHT,
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
import type { GameOutcome, PlayerCardView } from '@joutio/client-domain/api-types'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import type { TierCode } from '@/design-system'
import { useFollowPlayer, useHeadToHead, usePlayerProfile } from '../hooks/use-social'
import { useBlockMocks, useIsBlocked } from '../lib/block-mocks'
import { presenceLine } from '../lib/presence'
import { ChallengePlayerSheet } from './challenge-player-sheet'
import { userAvatar } from '@/shared/utils/avatar'
import { confirmUnfollow } from '../lib/confirm-unfollow'

const GUTTER = tokens.space[5]
const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }
const outcomeOf = (outcome: GameOutcome) => OUTCOMES[outcome]

/** Lab : fond uni (pas de bannière) et squelettes, `gap-6 pt-1`. */
function Loading() {
  return (
    <View accessibilityLabel="Chargement" style={{ gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[2] }}>
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
  const identity = usePlayerIdentity()
  const params = useLocalSearchParams<{ id: string }>()
  const id = params.id ?? ''
  const me = useMe(true)
  const insets = useSafeAreaInsets()
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
  const [actionsY, setActionsY] = useState(0)
  const data = profile.data
  const games = useHistoryGames(id, { opponentId: me.data?.userId ?? '', outcome: 'ALL', sort: 'RECENT' }, Boolean(id && me.data?.userId))

  // Le titre porté n'a que topicId:TIER : le nom du titre vient du sujet, comme dans le lab.
  const equipped = data?.equippedTitle?.split(':')
  const titleTopicId = equipped?.[0]
  const titleTier = equipped?.[1] as TierCode | undefined
  const titleOverview = useTopicOverview(titleTopicId ?? '', Boolean(titleTopicId))
  const titleText = titleTier ? (titleOverview.data?.titles?.fr?.[titleTier] ?? titleOverview.data?.topic.names?.fr ?? '') : ''

  const rating = data?.progression?.rating
  const provisional = data?.progression?.provisional ?? true
  const tier = rating != null && !provisional ? tierOf(rating) : undefined
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
        provisional,
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
        backLabel: 'Joueur',
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
    toast.success(`${data.pseudonym} est bloqué·e`)
  }
  const unblock = () => {
    if (!data) return
    setBlocked(data.userId, false)
    toast.success(`${data.pseudonym} est débloqué·e`)
  }

  return (
    <>
      <ParallaxScreen
        heroHeight={HERO_HEIGHT + AVATAR_SIZES.xxl - AVATAR_SIZES.xl}
        image={data?.bannerUrl ?? undefined}
        title={data?.pseudonym ?? 'Joueur'}
        premium={identity.premium(data)}
        eyebrow={data ? <Avatar name={data.pseudonym} src={userAvatar(data)} tier={tier} size="xxl" /> : undefined}
        centered
        barTitleStart
        onBack={() => router.back()}
        onRefresh={() => client.refetchQueries({ type: 'active' })}
        dockAt={HERO_HEIGHT + AVATAR_SIZES.xxl - AVATAR_SIZES.xl + actionsY - (insets.top + TOP_BAR_HEIGHT)}
        right={(docked) =>
          data && !data.isMe ? (
            <>
              {canAct && docked && (
                <>
                  <ParallaxIconButton icon={LightningIcon} label={`Défier ${data.pseudonym}`} onPress={() => setChallengeOpen(true)} />
                  <ParallaxIconButton icon={HeartIcon} label={data.following ? 'Ne plus suivre' : 'Suivre'} filled={data.following} onPress={toggleFollow} />
                </>
              )}
              <Menu
                items={[
                  { label: 'Signaler', icon: FlagIcon, onPress: () => setReportOpen(true) },
                  ...(blocked ? [] : [{ label: 'Bloquer', icon: ProhibitIcon, destructive: true, onPress: () => setBlockOpen(true) }]),
                ]}
              >
                {(open) => <ParallaxIconButton icon={DotsThreeIcon} label="Plus d'actions" onPress={open} />}
              </Menu>
            </>
          ) : undefined
        }
        intro={
          data ? (
            <View style={{ gap: tokens.space[4] }}>
              <View style={{ alignItems: 'center', gap: tokens.space[2] }}>
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
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: tokens.space[2] }}>
                  {tier ? <Badge variant="tier" tier={tier}>{`${tierLabel(tier)} · ${formatNumber(rating ?? 0)}`}</Badge> : <Pill>Non classé</Pill>}
                  {data.country && <Pill>{`${countryFlag(data.country)} ${countryName(data.country)}`}</Pill>}
                  {data.suspended && <Pill tone="suspended">Compte suspendu</Pill>}
                  {blocked && <Pill tone="wrong">Bloqué</Pill>}
                </View>
                {!data.suspended && !blocked && (
                  <Text variant="caption" color="muted">
                    {seen}
                  </Text>
                )}
              </View>
              {blocked && !data.isMe && (
                <Button full variant="gray" tone="neutral" onPress={unblock}>
                  Débloquer
                </Button>
              )}
              {canAct && (
                // 65 / 35 : le défi est l'action principale, comme « Lancer un duel » sur la Fiche sujet.
                <View onLayout={(event) => setActionsY(event.nativeEvent.layout.y)} style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                  <Button full style={{ flex: 65 }} icon={LightningIcon} variant="filled" tone="accent" onPress={() => setChallengeOpen(true)}>
                    Défier
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
                    {data.following ? 'Suivi' : 'Suivre'}
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
              title="Impossible de charger ce joueur"
              description="Vérifie ta connexion, puis réessaie."
              action={
                <Button style={{ alignSelf: 'center' }} loading={profile.isRefetching} onPress={() => void profile.refetch()}>
                  Réessayer
                </Button>
              }
            />
          </View>
        ) : (
          <View style={{ gap: tokens.space[6], paddingHorizontal: GUTTER, paddingTop: tokens.space[4], paddingBottom: tokens.space[8] }}>
            <View style={{ gap: tokens.space[3] }}>
              <SectionHeader title={`Ton bilan contre ${data.pseudonym}`} />
              {head.isPending ? (
                <Skeleton shape="card" style={{ height: 120 }} />
              ) : head.data && head.data.played > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                    <Stat label="Victoires" value={String(head.data.wins)} tone="up" compact />
                    <Stat label="Nul" value={String(head.data.draws)} compact />
                    <Stat label="Défaites" value={String(head.data.losses)} tone="down" compact />
                  </View>
                  <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: tokens.space[4] }}>
                    <OutcomeBar wins={head.data.wins} draws={head.data.draws} losses={head.data.losses} />
                  </View>
                </>
              ) : (
                <EmptyState icon={SwordIcon} title="Aucun duel pour l'instant" description={`Défie ${data.pseudonym} pour ouvrir votre face-à-face.`} />
              )}
            </View>
            {(head.isPending || played) && (
              <View style={{ gap: tokens.space[3] }}>
                <SectionHeader
                  title="Dernières parties"
                  action={
                    <Button variant="plain" size="S" onPress={openHistory}>
                      Tout voir
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
                  <EmptyState icon={SwordIcon} title="Aucune partie pour l'instant" description="Vos prochains duels apparaîtront ici." />
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
          subtitle="Fiche joueur"
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
          title={`Bloquer ${data.pseudonym} ?`}
          message="Vous ne pourrez plus vous défier, et ses messages n'arriveront plus."
          actions={[
            { label: 'Bloquer', variant: 'tinted', tone: 'destructive', onPress: block },
            { label: 'Annuler', variant: 'plain', tone: 'neutral' },
          ]}
        />
      )}
    </>
  )
}
