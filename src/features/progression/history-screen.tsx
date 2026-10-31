import { useMemo, useState } from "react";
import { SectionList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Sword } from "@/ui/phosphor";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { queryKeys } from "@/lib/query-keys";
import { profileGamesService } from "@/lib/services/profile-games";
import { topicName } from "@/shared/utils/topic-name";
import type { GameHistoryItemView } from "@/shared/types/bff";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoMatchRow } from "@/ui/jo/jo-match-row";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

type Filter = "all" | "HUMAN" | "BOT";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "HUMAN", label: "Classés" },
  { value: "BOT", label: "Entraînement" },
];

const PAGE_SIZE = 20;

function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso);
  const days = Math.round(
    (new Date(now).setHours(0, 0, 0, 0) - new Date(iso).setHours(0, 0, 0, 0)) /
      86_400_000,
  );
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function group(games: GameHistoryItemView[]) {
  const now = new Date();
  const sections: { title: string; data: GameHistoryItemView[] }[] = [];
  for (const game of games) {
    const title = dayLabel(game.playedAt, now);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(game);
    else sections.push({ title, data: [game] });
  }
  return sections;
}

export function HistoryScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const me = useMe();
  const userId = me.data?.userId ?? "";
  const language = me.data?.language ?? "fr";
  const [filter, setFilter] = useState<Filter>("all");
  const params = {
    opponentType: filter === "all" ? undefined : filter,
    size: PAGE_SIZE,
  };
  const games = useInfiniteQuery({
    queryKey: queryKeys.profiles.games(userId, params),
    queryFn: ({ pageParam }) =>
      profileGamesService.list(userId, { ...params, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.last ? undefined : lastPage.page + 1,
    enabled: !!userId,
  });
  const sections = useMemo(
    () => group(games.data?.pages.flatMap((page) => page.content) ?? []),
    [games.data],
  );

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: colors.background }}
      sections={sections}
      keyExtractor={(game) => game.gameId}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <View style={styles.filters}>
          <JoSegmented options={FILTERS} value={filter} onChange={setFilter} />
        </View>
      }
      renderSectionHeader={({ section }) => (
        <AppText
          variant="caption"
          weight="semibold"
          tone="secondary"
          style={styles.day}
        >
          {section.title}
        </AppText>
      )}
      renderItem={({ item, index, section }) => {
        const bot = item.opponentType === "BOT";
        const last = index === section.data.length - 1;
        const finished =
          item.outcome === "WIN" ||
          item.outcome === "LOSS" ||
          item.outcome === "DRAW";
        return (
          <View
            style={[
              { backgroundColor: colors.surface },
              index === 0 && styles.first,
              last && styles.last,
            ]}
          >
            <JoMatchRow
              title={topicName(item.topic.names, language)}
              subtitle={
                bot
                  ? "Entraînement"
                  : `contre ${item.opponent?.pseudonym ?? "un joueur"}`
              }
              topic={item.topic}
              outcome={item.outcome}
              score={`${item.myScore} · ${item.opponentScore}`}
              bot={bot}
              last={last}
              onPress={
                finished
                  ? () => router.push(`/(app)/duel/result/${item.gameId}`)
                  : undefined
              }
            />
          </View>
        );
      }}
      onEndReached={() => {
        if (games.hasNextPage && !games.isFetchingNextPage) {
          void games.fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.4}
      ListEmptyComponent={
        games.isPending ? (
          <JoLoading />
        ) : (
          <JoEmptyState
            icon={<Sword size={36} color={colors.accent} weight="fill" />}
            title="Aucune partie"
            message="Tes duels apparaîtront ici."
          />
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  filters: { paddingBottom: 4 },
  day: { paddingTop: 12, paddingBottom: 8, paddingHorizontal: 4 },
  first: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  last: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
});
