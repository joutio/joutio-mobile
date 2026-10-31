import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { useHome } from "@/features/home/hooks/useHome";
import type { TopicCardView } from "@/shared/types/bff";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { JoTopicCard } from "@/ui/jo/jo-topic-card";
import { useNativeTheme } from "@/ui/theme";
import { useCreateChallenge } from "../hooks/useChallenges";

interface ChallengeTopicSheetProps {
  /** Joueur à défier ; la feuille s'ouvre dès qu'il est renseigné. */
  player: { userId: string; pseudonym: string } | null;
  onClose: () => void;
}

/** Choix du sujet d'un défi nominatif : sujets suivis puis tendances. */
export function ChallengeTopicSheet({ player, onClose }: ChallengeTopicSheetProps) {
  const { colors } = useNativeTheme();
  const { height } = useWindowDimensions();
  const me = useMe();
  const home = useHome();
  const create = useCreateChallenge();
  const topics = Array.from(
    new Map(
      [
        ...(home.data?.followedTopics ?? []),
        ...(home.data?.trendingTopics ?? []),
      ].map((topic): [string, TopicCardView] => [topic.topicId, topic]),
    ).values(),
  );

  return (
    <JoSheet
      visible={player !== null}
      onClose={onClose}
      title="Sur quel sujet ?"
      subtitle={player ? `Défier ${player.pseudonym}` : undefined}
    >
      <View style={styles.body}>
        {home.isPending ? (
          <JoLoading />
        ) : (
          <ScrollView
            nestedScrollEnabled
            style={[
              styles.list,
              { maxHeight: height * 0.6, backgroundColor: colors.raised },
            ]}
          >
            {topics.map((topic, index) => (
              <JoTopicCard
                key={topic.topicId}
                topic={topic}
                language={me.data?.language ?? "fr"}
                size="row"
                last={index === topics.length - 1}
                onPress={() => {
                  if (!player) return;
                  create.mutate(
                    { topicId: topic.topicId, opponentId: player.userId },
                    { onSuccess: onClose },
                  );
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </JoSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 16 },
  list: { borderRadius: 16 },
});
