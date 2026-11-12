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
import type { TopicCardView } from '@joutio/client-domain/api-types'
import { topicName } from '@/shared/utils/topic-name'
import { useCompleteOnboarding, useRecommendations } from '../hooks/use-onboarding'
import { useOnboardingStore } from '../onboarding-store'
import { Steps } from './steps'

const imageOf = (topic: TopicCardView) => topic.imageUrl ?? undefined

/**
 * Premier thème : aperçu du thème choisi, puis la liste radio des recommandations. Titre et aperçu restent fixes,
 * seule la liste défile ; un dégradé signale la suite.
 */
export function FirstTopicStep() {
  const { colors, radius } = useTheme()
  const universes = useOnboardingStore((state) => state.universes)
  const recommendations = useRecommendations(universes)
  const complete = useCompleteOnboarding()
  const topics = recommendations.data ?? []
  const [pickedId, setPickedId] = useState<string | null>(null)
  const picked = topics.find((topic) => topic.topicId === pickedId) ?? topics[0]
  // Un dégradé signale qu'il reste des thèmes sous la ligne visible.
  const [scroll, setScroll] = useState({ offset: 0, layout: 0, content: 0 })
  const more = scroll.offset + scroll.layout < scroll.content - 4

  // Le duel contre un bot arrive avec l'écran Duel : en attendant, les deux actions terminent l'onboarding.
  const finish = () => complete.mutate()

  return (
    <Steps
      index={2}
      fill
      action={
        <Button variant="plain" tone="neutral" size="M" disabled={complete.isPending} onPress={finish}>
          Explorer l'accueil
        </Button>
      }
      footer={
        <View style={{ gap: tokens.space[3] }}>
          {complete.isError && <Notice title="L'accueil n'a pas pu s'ouvrir" message="Vérifie ta connexion et réessaie." />}
          <Button full icon={LightningIcon} disabled={!picked} loading={complete.isPending} onPress={finish}>
            Découvrir le duel
          </Button>
        </View>
      }
    >
      <View style={{ gap: tokens.space[3] }}>
        <Text variant="title1" accessibilityRole="header">
          Ton premier thème
        </Text>
        <Text color="muted">Choisis-en un pour commencer. Contre un bot, sans Elo ni XP.</Text>
      </View>

      {universes.length === 0 ? (
        <EmptyState fill icon={SwordIcon} title="Aucun univers choisi" description="Explore l'accueil pour trouver ton premier duel." />
      ) : recommendations.isLoading ? (
        <View style={{ gap: tokens.space[4] }}>
          <Skeleton shape="card" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </View>
      ) : recommendations.isError ? (
        <Notice
          title="Les thèmes n'ont pas pu se charger"
          message="Vérifie ta connexion."
          action={{ label: 'Réessayer', onPress: () => void recommendations.refetch() }}
        />
      ) : !picked ? (
        <EmptyState fill icon={SwordIcon} title="Aucun thème pour l'instant" description="Explore l'accueil pour trouver ton premier duel." />
      ) : (
        <>
          <TopicCard title={topicName(picked.names)} category={toCategoryCode(picked.category)} image={imageOf(picked)} />
          <View style={{ flex: 1, minHeight: 0 }}>
            <ScrollView
              style={{ flex: 1, borderRadius: radius.lg, backgroundColor: colors.surface }}
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={32}
              onLayout={(event) => setScroll((value) => ({ ...value, layout: event.nativeEvent.layout.height }))}
              onContentSizeChange={(_, height) => setScroll((value) => ({ ...value, content: height }))}
              onScroll={(event) => setScroll((value) => ({ ...value, offset: event.nativeEvent.contentOffset.y }))}
            >
              <RadioGroup label="Premier thème">
                {topics.map((topic, index) => (
                  <TopicRow
                    key={topic.topicId}
                    title={topicName(topic.names)}
                    category={toCategoryCode(topic.category)}
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
