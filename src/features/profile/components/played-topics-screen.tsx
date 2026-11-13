import { router } from '@/shared/navigation/router'
import { useMemo } from 'react'
import { View } from 'react-native'
import {
  Button,
  ChartLineUpIcon,
  CrownSimpleIcon,
  EmptyState,
  FeedFooter,
  ListGroup,
  MobileTopBar,
  Screen,
  Skeleton,
  Text,
  toCategoryCode,
  tokens,
  TopicRow,
  WarningCircleIcon,
} from '@/design-system'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { openTopic } from '@/features/topic'
import { formatNumber, tierLabel } from '@/features/topic/lib/format'
import { feedFooterProps, loadMoreOptions, useClientPages } from '@/shared/utils/paging'
import { topicName } from '@/shared/utils/topic-name'
import { useMyTopics } from '../hooks/use-profile'
import { masteryOf } from '../lib/format'

const PAGE_SIZE = 20

const gamesLabel = (games: number) => `${formatNumber(games)} partie${games > 1 ? 's' : ''}`

/**
 * Sujets joués (`profil.md`), ouverte par « Tout voir » : chaque sujet joué avec son nombre de parties, son palier de
 * maîtrise et son XP, du plus maîtrisé au moins maîtrisé ; 20 par page, puis l'encart Premium. Un sujet ouvre sa fiche.
 */
export function PlayedTopicsScreen() {
  const topics = useMyTopics()
  const showPremium = usePremiumSheet((state) => state.show)
  // Le BFF renvoie aussi des sujets sans partie : seuls ceux joués au moins une fois comptent ici.
  const sorted = useMemo(() => (topics.data ?? []).filter((topic) => topic.games > 0).sort((a, b) => b.xp - a.xp || b.games - a.games), [topics.data])
  const { visible: shown, source } = useClientPages(sorted, PAGE_SIZE)

  const content = () => {
    if (topics.isPending)
      return (
        <View style={{ gap: tokens.space[3] }}>
          <Skeleton shape="row" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </View>
      )
    if (topics.isError)
      return (
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger tes sujets"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={topics.isRefetching} onPress={() => void topics.refetch()}>
              Réessayer
            </Button>
          }
        />
      )
    if (sorted.length === 0)
      return <EmptyState icon={ChartLineUpIcon} title="Aucun sujet joué" description="Joue tes premiers duels pour suivre ta maîtrise sujet par sujet." />
    return (
      <>
        <ListGroup surface="surface">
          {shown.map((topic, index) => {
            const name = topicName(topic.names)
            return (
              <TopicRow
                key={topic.topicId}
                title={name}
                category={toCategoryCode(undefined)}
                pictogram={topic.pictogramUrl ?? undefined}
                image={topic.imageUrl ?? undefined}
                sub={`${gamesLabel(topic.games)} · ${tierLabel(masteryOf(topic.xp))} · ${formatNumber(topic.xp)} XP`}
                onPress={() => openTopic('profile', { topicId: topic.topicId, names: topic.names, bannerUrl: null, imageUrl: topic.imageUrl, category: null })}
                last={index === shown.length - 1}
              />
            )
          })}
        </ListGroup>
        <FeedFooter {...feedFooterProps(source)} endLabel="Tu as vu tous tes sujets" />
        <View style={{ gap: tokens.space[3] }}>
          <Text variant="caption" color="muted" align="center">
            Victoires et temps de réponse sujet par sujet avec Premium.
          </Text>
          <Button full variant="tinted" icon={CrownSimpleIcon} onPress={() => showPremium()}>
            Découvrir Premium
          </Button>
        </View>
      </>
    )
  }

  return (
    <Screen
      inTabs
      header={<MobileTopBar variant="inline" back="Profil" onBack={() => router.back()} title="Sujets joués" />}
      loadMore={loadMoreOptions(source)}
      onRefresh={() => topics.refetch()}
      contentStyle={{ gap: tokens.space[4], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[7] }}
    >
      {content()}
    </Screen>
  )
}
