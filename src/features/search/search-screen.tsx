import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { ClockCounterClockwise } from "@/ui/phosphor";
import { JoSearchField } from "@/ui/jo/jo-search-field";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { queryKeys } from "@/lib/query-keys";
import { meService } from "@/lib/services/me";
import { getItem, setItem } from "@/lib/storage";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { topicName } from "@/shared/utils/topic-name";
import type { SuggestionView, TopicCardView } from "@/shared/types/bff";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPlayerRow } from "@/ui/jo/jo-player-row";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoTopicCard } from "@/ui/jo/jo-topic-card";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const RECENTS_KEY = "joutio.search.recents";
const MAX_RECENTS = 5;
const MIN_QUERY = 2;

function asTopicCard(item: SuggestionView): TopicCardView {
  return {
    topicId: item.id,
    names: item.names ?? { fr: item.label },
    description: null,
    category: item.category,
    categoryLabel: null,
    emoji: item.emoji,
    color: item.color,
    imageUrl: item.imageUrl,
    bannerUrl: null,
    followersCount: 0,
    questionsCount: 0,
    followed: false,
    status: "PUBLISHED",
  };
}

/** Recherche unique : sujets et joueurs, récents tant que le champ est vide. */
export function SearchScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const { top } = useSafeAreaInsets();
  const me = useMe();
  const language = me.data?.language ?? "fr";
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const term = useDebounce(query.trim(), 250);
  const results = useQuery({
    queryKey: queryKeys.suggestions(term),
    queryFn: () => meService.suggestions(term),
    enabled: term.length >= MIN_QUERY,
    staleTime: 30_000,
  });

  useEffect(() => {
    void getItem(RECENTS_KEY).then((value) => {
      if (value) setRecents(JSON.parse(value) as string[]);
    });
  }, []);

  const remember = (value: string) => {
    const next = [value, ...recents.filter((item) => item !== value)].slice(
      0,
      MAX_RECENTS,
    );
    setRecents(next);
    void setItem(RECENTS_KEY, JSON.stringify(next));
  };

  const clear = () => {
    setRecents([]);
    void setItem(RECENTS_KEY, "[]");
  };

  const topics = results.data?.filter((item) => item.type === "TOPIC") ?? [];
  const players = results.data?.filter((item) => item.type === "PLAYER") ?? [];
  const searching = term.length >= MIN_QUERY;

  return (
    <View style={[styles.root, { paddingTop: top + 4, backgroundColor: colors.background }]}>
      <View style={styles.bar}>
        <JoSearchField
          value={query}
          onChangeText={setQuery}
          placeholder="Sujets et joueurs"
          autoFocus
          onCancel={() => router.back()}
        />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.content}
      >
        {searching && results.isPending ? <JoLoading /> : null}

        {topics.length > 0 ? (
          <View style={styles.section}>
            <JoSectionHeader title="Sujets" />
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {topics.map((item, index) => (
                <JoTopicCard
                  key={item.id}
                  topic={asTopicCard(item)}
                  language={language}
                  size="row"
                  subtitle={item.subtitle ?? undefined}
                  last={index === topics.length - 1}
                  onPress={() => {
                    remember(topicName(item.names, language, item.label));
                    router.push(`/topic/${item.id}`);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {players.length > 0 ? (
          <View style={styles.section}>
            <JoSectionHeader title="Joueurs" />
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {players.map((item, index) => (
                <JoPlayerRow
                  key={item.id}
                  name={item.label}
                  subtitle={item.subtitle ?? undefined}
                  last={index === players.length - 1}
                  onPress={() => {
                    remember(item.label);
                    router.push(`/player/${item.id}`);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        {searching && results.data?.length === 0 ? (
          <AppText variant="callout" tone="secondary" style={styles.empty}>
            Aucun résultat pour « {term} ».
          </AppText>
        ) : null}

        {!searching && recents.length > 0 ? (
          <View style={styles.section}>
            <JoSectionHeader title="Récemment" action="Effacer" onAction={clear} />
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {recents.map((item, index) => (
                <JoListRow
                  key={item}
                  label={item}
                  control="none"
                  icon={
                    <ClockCounterClockwise size={20} color={colors.secondaryLabel} />
                  }
                  last={index === recents.length - 1}
                  onPress={() => setQuery(item)}
                />
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  content: { gap: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  section: { gap: 12 },
  list: { borderRadius: 16, overflow: "hidden" },
  empty: { textAlign: "center", paddingVertical: 24 },
});
