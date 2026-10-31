import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { CloudSlash } from "@/ui/phosphor";
import { useMe } from "@/features/auth/hooks/useMe";
import { useActiveGames } from "@/features/duel/hooks/useActiveGames";
import { useHome } from "@/features/home/hooks/useHome";
import type { Language, TopicCardView } from "@/shared/types/bff";
import { JoBanner } from "@/ui/jo/jo-banner";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoTopicCard } from "@/ui/jo/jo-topic-card";
import { useNativeTheme } from "@/ui/theme";
import { TOPICS_HREF } from "@/lib/navigation";

const RAIL_CARD_WIDTH = 220;

function Rail({
  topics,
  language,
  onOpen,
}: {
  topics: TopicCardView[];
  language: Language;
  onOpen: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.rail}
      contentContainerStyle={styles.railContent}
    >
      {topics.map((topic) => (
        <JoTopicCard
          key={topic.topicId}
          topic={topic}
          language={language}
          size="M"
          width={RAIL_CARD_WIDTH}
          onPress={() => onOpen(topic.topicId)}
        />
      ))}
    </ScrollView>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const theme = useNativeTheme();
  const home = useHome();
  const me = useMe();
  const activeGames = useActiveGames();
  const language = me.data?.language ?? "fr";
  const activeGame = activeGames.data?.[0] ?? null;
  const openTopic = (topicId: string) =>
    router.push(`/topic/${topicId}`);
  const openCatalog = () => router.navigate(TOPICS_HREF);
  const trending = home.data?.trendingTopics ?? [];
  const followed = home.data?.followedTopics ?? [];
  const fresh = home.data?.newTopics ?? [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={home.isRefetching}
          onRefresh={() => void home.refetch()}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
        />
      }
    >
      {activeGame ? (
        <JoBanner
          title="Partie en cours"
          message={`contre ${
            activeGame.opponent?.pseudonym ??
            (activeGame.opponentType === "BOT" ? "le bot" : "ton adversaire")
          }`}
          action="Rejoindre"
          onAction={() => router.push(`/(app)/duel/${activeGame.gameId}`)}
        />
      ) : null}

      {home.isPending ? (
        <JoLoading />
      ) : !home.data ? (
        <>
          <JoBanner
            tone="error"
            icon={<CloudSlash size={24} color={theme.colors.danger} />}
            title="Impossible de charger l'accueil."
            message="Le serveur ne répond pas. Tes duels en cours ne sont pas perdus."
            action="Réessayer"
            onAction={() => void home.refetch()}
          />
          <View style={styles.skeletons}>
            <View style={[styles.skeleton, { backgroundColor: theme.colors.surface }]} />
            <View style={[styles.skeleton, { backgroundColor: theme.colors.surface }]} />
          </View>
        </>
      ) : (
        <>
          {trending.length > 0 ? (
            <View style={styles.section}>
              <JoSectionHeader
                title="Top 10 du moment"
                action="Catalogue"
                onAction={openCatalog}
              />
              <Rail topics={trending} language={language} onOpen={openTopic} />
            </View>
          ) : null}

          {followed.length > 0 ? (
            <View style={styles.section}>
              <JoSectionHeader
                title="Tes sujets suivis"
                action="Tout voir"
                onAction={openCatalog}
              />
              <View
                style={[styles.list, { backgroundColor: theme.colors.surface }]}
              >
                {followed.slice(0, 3).map((topic, index, shown) => (
                  <JoTopicCard
                    key={topic.topicId}
                    topic={topic}
                    language={language}
                    size="row"
                    last={index === shown.length - 1}
                    onPress={() => openTopic(topic.topicId)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {fresh.length > 0 ? (
            <View style={styles.section}>
              <JoSectionHeader
                title="Nouveaux thèmes"
                action="Tout voir"
                onAction={openCatalog}
              />
              <Rail topics={fresh} language={language} onOpen={openTopic} />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 24 },
  section: { gap: 12 },
  skeletons: { flexDirection: "row", gap: 12 },
  skeleton: { flex: 1, height: 220, borderRadius: 16 },
  rail: { marginHorizontal: -16 },
  railContent: { gap: 12, paddingHorizontal: 16 },
  list: { borderRadius: 16, overflow: "hidden" },
});
