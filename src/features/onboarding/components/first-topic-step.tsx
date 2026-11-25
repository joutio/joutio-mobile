import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import {
  alpha,
  Notice,
  Button,
  EmptyState,
  LightningIcon,
  RadioGroup,
  Skeleton,
  SwordIcon,
  Text,
  toCategoryCode,
  TopicCard,
  TopicRow,
  tokens,
  useTheme,
} from '@/design-system'
import type { TopicCardView } from '@joutio/client/topics'
import { useCompleteOnboarding, useRecommendations } from '@joutio/client/onboarding'
import { useCreateBotRoom } from '@joutio/client/rooms'
import { botRoomError, openRoom } from '@/features/play/hooks/use-play'
import { usePendingJoin } from '@/shared/stores/pending-join-store'
import { topicName } from '@/shared/utils/topic-name'
import { useOnboardingStore } from '../onboarding-store'
import { Steps } from './steps'
import { useT } from '@/lib/i18n'

const imageOf = (topic: TopicCardView) => topic.imageUrl ?? undefined

/**
 * Premier thème : aperçu du thème choisi, puis la liste radio des recommandations. Titre et aperçu restent fixes,
 * seule la liste défile ; un dégradé signale la suite. « Explorer l'accueil » termine l'onboarding ; « Découvrir le duel »
 * crée d'abord le salon bot (robot facile, thème choisi) et attend la réponse, puis termine l'onboarding et ouvre ce
 * salon dès la bascule vers l'app connectée, sans attente réseau sur l'accueil (2026-11-14).
 */
export function FirstTopicStep() {
  const t = useT()
  const { colors, radius } = useTheme()
  const universes = useOnboardingStore((state) => state.universes)
  const recommendations = useRecommendations(universes)
  const complete = useCompleteOnboarding()
  const botRoom = useCreateBotRoom()
  const topics = recommendations.data ?? []
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = topics.find((topic) => topic.topicId === pickedId) ?? topics[0]
  // Un dégradé signale qu'il reste des thèmes sous la ligne visible.
  const [scroll, setScroll] = useState({ offset: 0, layout: 0, content: 0 })
  const more = scroll.offset + scroll.layout < scroll.content - 4

  // Lien de salon ouvert avant l'inscription : l'onboarding ne crée pas son propre salon, l'entrée y ramène.
  const pendingJoin = usePendingJoin((state) => state.roomId)
  const finish = () => complete.mutate(universes)
  const play = () => {
    if (!picked) return
    if (pendingJoin) return finish()
    const topic = { topicId: picked.topicId, name: topicName(picked.names), category: toCategoryCode(picked.category) }
    // Salon d'abord : la commande est traitée, le salon existe quand l'écran s'ouvre. Puis l'onboarding se termine,
    // la navigation protégée bascule vers l'app connectée et le salon déjà créé s'ouvre.
    botRoom.mutate(
      { topicId: topic.topicId, difficulty: 'EASY' },
      {
        onSuccess: ({ id }) => complete.mutate(universes, { onSuccess: () => setTimeout(() => openRoom(id, topic), 0) }),
        onError: botRoomError,
      },
    )
  }

  return (
    <Steps
      index={2}
      fill
      action={
        <Button variant="plain" tone="neutral" size="M" disabled={complete.isPending || botRoom.isPending} onPress={finish}>
          {t('onboarding.first.explore')}
        </Button>
      }
      footer={
        <View style={{ gap: tokens.space[3] }}>
          {complete.isError && <Notice title={t('onboarding.first.completeError')} message={t('common.checkConnection')} />}
          <Button full icon={LightningIcon} disabled={!picked} loading={complete.isPending || botRoom.isPending} onPress={play}>
            {t('onboarding.first.play')}
          </Button>
        </View>
      }
    >
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="title1" accessibilityRole="header">
          {t('onboarding.first.title')}
        </Text>
        <Text color="muted">{t('onboarding.first.subtitle')}</Text>
      </View>

      {universes.length === 0 ? (
        <EmptyState fill icon={SwordIcon} title={t('mobile.onboarding.noUniverse')} description={t('onboarding.first.emptyHint')} />
      ) : recommendations.isLoading ? (
        <View style={{ gap: tokens.space[4] }}>
          <Skeleton shape="card" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </View>
      ) : recommendations.isError ? (
        <Notice
          title={t('onboarding.first.loadError')}
          message={t('common.checkConnectionShort')}
          action={{ label: t('callback.retry'), onPress: () => void recommendations.refetch() }}
        />
      ) : !picked ? (
        <EmptyState fill icon={SwordIcon} title={t('onboarding.first.empty')} description={t('onboarding.first.emptyHint')} />
      ) : (
        <>
          <TopicCard official={picked.official ?? false} title={topicName(picked.names)} category={toCategoryCode(picked.category)} image={imageOf(picked)} />
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollView
              style={{ flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface }}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={32}
              onLayout={(event) => setScroll((value) => ({ ...value, layout: event.nativeEvent.layout.height }))}
              onContentSizeChange={(_, height) => setScroll((value) => ({ ...value, content: height }))}
              onScroll={(event) => setScroll((value) => ({ ...value, offset: event.nativeEvent.contentOffset.y }))}
            >
              <RadioGroup label={t('onboarding.first.list')}>
                {topics.map((topic, index) => (
                  <TopicRow
                    key={topic.topicId}
                    official={topic.official ?? false}
                    title={topicName(topic.names)}
                    category={toCategoryCode(topic.category)}
                    pictogram={topic.pictogramUrl ?? undefined}
                    image={imageOf(topic)}
                    control="radio"
                    on={topic.topicId === picked.topicId}
                    onPress={() => setPickedId(topic.topicId)}
                    last={index === topics.length - 1}
                  />
                ))}
              </RadioGroup>
            </ScrollView>
            {more && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 48,
                  borderBottomLeftRadius: radius.lg,
                  borderBottomRightRadius: radius.lg,
                  experimental_backgroundImage: `linear-gradient(to top, ${colors.surface}, ${alpha(colors.surface, 0)})`,
                }}
              />
            )}
          </View>
        </>
      )}
    </Steps>
  )
}
