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
import { t, useT } from '@/lib/i18n'

const PAGE_SIZE = 20

const gamesLabel = (games: number) => t(games > 1 ? 'profile.gamesMany' : 'profile.gamesOne', { count: formatNumber(games) })

/**
 * Sujets joués (`profil.md`), ouverte par « Tout voir » : chaque sujet joué avec son nombre de parties, son palier de
 * maîtrise et son XP, du plus maîtrisé au moins maîtrisé ; 20 par page, puis l'encart Premium. Un sujet ouvre sa fiche.
 */
export function PlayedTopicsScreen() {
  const t = useT()
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
          title={t('profile.topicsError')}
          description={t('home.errorText')}
          action={
            <Button style={{ alignSelf: 'center' }} loading={topics.isRefetching} onPress={() => void topics.refetch()}>
              {t('callback.retry')}
            </Button>
          }
        />
      )
    if (sorted.length === 0)
      return <EmptyState icon={ChartLineUpIcon} title={t('profile.noTopicsTitle')} description={t('mobile.profile.noPlayedTopicText')} />
    return (
      <>
        <ListGroup surface="surface">
          {shown.map((topic, index) => {
            const name = topicName(topic.names)
            return (
              <TopicRow
                key={topic.topicId}
                title={name}
                official={topic.official ?? false}
                category={toCategoryCode(undefined)}
                pictogram={topic.pictogramUrl ?? undefined}
                image={topic.imageUrl ?? undefined}
                sub={t('profile.topicSub', { games: gamesLabel(topic.games), tier: tierLabel(masteryOf(topic.xp)), xp: formatNumber(topic.xp) })}
                onPress={() => openTopic('profile', { topicId: topic.topicId, names: topic.names, bannerUrl: null, imageUrl: topic.imageUrl, category: null })}
                last={index === shown.length - 1}
              />
            )
          })}
        </ListGroup>
        <FeedFooter {...feedFooterProps(source)} endLabel={t('profile.topicsEnd')} />
        <View style={{ gap: tokens.space[3] }}>
          <Text variant="caption" color="muted" align="center">
            {t('mobile.profile.premiumStats')}
          </Text>
          <Button full variant="tinted" icon={CrownSimpleIcon} onPress={() => showPremium()}>
            {t('profile.discoverPremium')}
          </Button>
        </View>
      </>
    )
  }

  return (
    <Screen
      inTabs
      header={<MobileTopBar variant="inline" back={t('nav.profile')} onBack={() => router.back()} title={t('profile.playedTopics')} />}
      loadMore={loadMoreOptions(source)}
      onRefresh={() => topics.refetch()}
      contentStyle={{ gap: tokens.space[4], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[7] }}
    >
      {content()}
    </Screen>
  )
}
