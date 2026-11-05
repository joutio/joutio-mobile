import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'
import {
  Avatar,
  Banner,
  Button,
  EmptyState,
  HeartIcon,
  ListGroup,
  MapPinIcon,
  MatchRow,
  MobileTopBar,
  ParallaxIconButton,
  ParallaxScreen,
  Pill,
  Screen,
  SectionHeader,
  Skeleton,
  SplashLogo,
  Stat,
  SwordIcon,
  Text,
  TitleRibbon,
  TrophyIcon,
  toCategoryCode,
  tokens,
  useTheme,
  WarningCircleIcon,
  type MatchOutcome,
} from '@/design-system'
import { useMe } from '@/features/me'
import { useHistoryGames } from '@/features/history/hooks/use-history'
import { dayLabel, formatNumber, tierLabel } from '@/features/topic/lib/format'
import type { GameOutcome, HeadToHeadView, PlayerCardView } from '@/shared/types/bff'
import { countryLabel } from '@/shared/utils/country'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import type { TierCode } from '@/design-system'
import { useFollowPlayer, useHeadToHead, usePlayerProfile, usePlayerTopics } from '../hooks/use-social'
import { ChallengePlayerSheet } from './challenge-player-sheet'

const OUTCOMES: Partial<Record<GameOutcome, MatchOutcome>> = { WIN: 'win', LOSS: 'loss', DRAW: 'draw' }

const outcomeOf = (outcome: GameOutcome): MatchOutcome | undefined => OUTCOMES[outcome]

/** Bilan des duels communs : barre + trois chiffres, toujours sous les libellés. */
function HeadToHeadBar({ wins, draws, losses }: HeadToHeadView) {
  const { colors, radius } = useTheme()
  const total = wins + draws + losses
  if (total === 0) return null
  return (
    <View style={{ height: 8, flexDirection: 'row', gap: 2, overflow: 'hidden', borderRadius: radius.xs, backgroundColor: colors.raised }}>
      {wins > 0 && <View style={{ flex: wins, backgroundColor: colors.correct }} />}
      {draws > 0 && <View style={{ flex: draws, backgroundColor: colors.accent }} />}
      {losses > 0 && <View style={{ flex: losses, backgroundColor: colors.wrong }} />}
    </View>
  )
}

function Loading() {
  return (
    <Screen scroll={false} header={<MobileTopBar variant="inline" title="Joueur" back="Social" onBack={() => router.back()} />}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <SplashLogo variant="loading" />
      </View>
    </Screen>
  )
}

/**
 * Fiche joueur minimale (`fiche-joueur.md`) : identité, rang, présence, suivi, défi et dernières parties.
 * Les actions de la barre compacte reprennent Défier et Suivre, comme sur la Fiche sujet.
 */
export function PlayerProfileScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const id = params.id ?? ''
  const me = useMe(true)
  const profile = usePlayerProfile(id)
  const follow = useFollowPlayer(id)
  const head = useHeadToHead(id)
  const [challengeOpen, setChallengeOpen] = useState(false)
  const games = useHistoryGames(id, { opponentId: me.data?.userId ?? '', outcome: 'ALL', sort: 'RECENT' }, Boolean(id && me.data?.userId))
  // Le titre porté n'a que topicId:TIER : le nom du sujet vient des sujets joués.
  const data = profile.data
  const equipped = data?.equippedTitle?.split(':')
  const titleTopicId = equipped?.[0]
  const titleTier = equipped?.[1] as TierCode | undefined
  const topics = usePlayerTopics(id, Boolean(titleTopicId))
  const titleTopic = topics.data?.find((topic) => topic.topicId === titleTopicId)

  if (profile.isPending) return <Loading />
  if (profile.isError || !data) {
    return (
      <Screen scroll={false} header={<MobileTopBar variant="inline" title="Joueur" back="Social" onBack={() => router.back()} />}>
        <View style={{ flex: 1, padding: tokens.space[5], justifyContent: 'center' }}>
          <EmptyState
            icon={WarningCircleIcon}
            title="Impossible de charger ce joueur"
            description="Vérifie ta connexion, puis réessaie."
            action={
              <View style={{ gap: tokens.space[3], alignSelf: 'stretch' }}>
                <Button style={{ alignSelf: 'center' }} loading={profile.isRefetching} onPress={() => void profile.refetch()}>
                  Réessayer
                </Button>
                <Button variant="plain" tone="neutral" onPress={() => router.back()}>
                  Retour
                </Button>
              </View>
            }
          />
        </View>
      </Screen>
    )
  }

  const rating = data.progression?.rating
  const provisional = data.progression?.provisional ?? true
  const tier = rating != null && !provisional ? tierOf(rating) : undefined
  const stats = data.stats
  const latest =
    games.data?.pages
      .flatMap((page) => page.content)
      .filter((game) => outcomeOf(game.outcome))
      .slice(0, 10) ?? []
  const challengePlayer: PlayerCardView = {
    userId: data.userId,
    pseudonym: data.pseudonym,
    avatarOptions: data.avatarOptions,
    rating: rating ?? 0,
    provisional,
    following: data.following,
    presence: data.presence,
    suspended: data.suspended,
  }
  const toggleFollow = () => follow.mutate(!data.following)
  const openHistory = () =>
    router.push({
      pathname: '/social/history',
      params: {
        userId: data.userId,
        opponentId: me.data?.userId ?? '',
        opponentName: data.pseudonym,
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

  return (
    <>
      <ParallaxScreen
        image={data.bannerUrl ?? undefined}
        title={data.pseudonym}
        eyebrow={<Avatar name={data.pseudonym} tier={tier} size="xl" />}
        centered
        onBack={() => router.back()}
        right={
          data.isMe || data.suspended ? undefined : (
            <>
              <ParallaxIconButton icon={HeartIcon} label={data.following ? 'Ne plus suivre' : 'Suivre'} filled={data.following} onPress={toggleFollow} />
              <ParallaxIconButton icon={SwordIcon} label="Défier" onPress={() => setChallengeOpen(true)} />
            </>
          )
        }
        intro={
          <View style={{ gap: tokens.space[4] }}>
            {titleTopic && titleTier && <TitleRibbon tier={titleTier} text={topicName(titleTopic.names)} width={200} style={{ alignSelf: 'center' }} />}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: tokens.space[2] }}>
              {tier ? <Pill tone="pending" icon={TrophyIcon}>{`${tierLabel(tier)} · ${formatNumber(rating ?? 0)}`}</Pill> : <Pill>Non classé</Pill>}
              {data.country && <Pill icon={MapPinIcon}>{countryLabel(data.country)}</Pill>}
              {data.suspended ? (
                <Pill tone="suspended">Compte suspendu</Pill>
              ) : data.presence?.status === 'ONLINE' ? (
                <Pill tone="online">En ligne</Pill>
              ) : (
                <Pill>Hors ligne</Pill>
              )}
            </View>
            {data.bio && (
              <Text color="muted" align="center">
                {data.bio}
              </Text>
            )}
            <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
              <Stat label="Parties" value={formatNumber(stats?.played ?? 0)} compact />
              <Stat label="Abonnés" value={formatNumber(data.followersCount)} compact />
              <Stat label="Abonnements" value={formatNumber(data.followingCount)} compact />
            </View>
            {data.suspended ? (
              <Banner tone="info" title="Compte suspendu" message="Ce joueur ne peut plus être défié ni suivi." />
            ) : data.isMe ? (
              <Banner tone="info" title="C'est ton profil" message="Tu ne peux pas te défier toi-même." />
            ) : (
              <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                <Button full icon={SwordIcon} style={{ flex: 65 }} onPress={() => setChallengeOpen(true)}>
                  Défier
                </Button>
                <Button
                  full
                  variant={data.following ? 'gray' : 'tinted'}
                  tone={data.following ? 'neutral' : 'accent'}
                  icon={data.following ? undefined : HeartIcon}
                  accessibilityState={{ selected: data.following }}
                  loading={follow.isPending}
                  style={{ flex: 35 }}
                  onPress={toggleFollow}
                >
                  {data.following ? 'Suivi' : 'Suivre'}
                </Button>
              </View>
            )}
          </View>
        }
      >
        <View style={{ gap: tokens.space[6], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}>
          {!data.isMe && (
            <View style={{ gap: tokens.space[3] }}>
              <SectionHeader title={`Ton bilan contre ${data.pseudonym}`} />
              {head.isPending ? (
                <Skeleton shape="card" style={{ height: 120 }} />
              ) : head.data && head.data.played > 0 ? (
                <View style={{ gap: tokens.space[3] }}>
                  <HeadToHeadBar {...head.data} />
                  <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
                    <Stat label="Victoires" value={formatNumber(head.data.wins)} tone="up" compact />
                    <Stat label={head.data.draws > 1 ? 'Nuls' : 'Nul'} value={formatNumber(head.data.draws)} compact />
                    <Stat label="Défaites" value={formatNumber(head.data.losses)} tone="down" compact />
                  </View>
                </View>
              ) : (
                <EmptyState icon={SwordIcon} title="Jamais affronté" description="Vos duels communs apparaîtront ici." />
              )}
            </View>
          )}
          <View style={{ gap: tokens.space[3] }}>
            <SectionHeader
              title="Dernières parties"
              action={
                <Button variant="plain" tone="neutral" size="S" onPress={openHistory}>
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
              <EmptyState icon={SwordIcon} title="Aucune partie commune" description="Défie ce joueur pour lancer la première." />
            ) : (
              <ListGroup>
                {latest.map((game, index) => {
                  const outcome = outcomeOf(game.outcome)
                  if (!outcome) return null
                  return (
                    <MatchRow
                      key={game.gameId}
                      topic={topicName(game.topic.names)}
                      category={toCategoryCode(game.topic.category)}
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
        </View>
      </ParallaxScreen>
      <ChallengePlayerSheet player={challengeOpen ? challengePlayer : null} onClose={() => setChallengeOpen(false)} />
    </>
  )
}
