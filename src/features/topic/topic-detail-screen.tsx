import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeft, Check, Lightning } from "phosphor-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMe } from "@/features/auth/hooks/useMe";
import { NativePlayModeModal } from "@/features/duel/components/native-play-mode-modal";
import { TopicTitlesList } from "@/features/topic/components/topic-titles-list";
import {
  useToggleTopicFollow,
  useTopicGames,
  useTopicLeaderboard,
  useTopicOverview,
} from "@/features/topic/hooks/useTopicDetail";
import { compactNumber } from "@/lib/helpers";
import { categoryColor, categoryLabel } from "@/shared/utils/categories";
import { eloTier } from "@/shared/utils/elo";
import { masteryTierLabel } from "@/shared/utils/mastery";
import { topicName } from "@/shared/utils/topic-name";
import type {
  GameHistoryOutcome,
  LeaderboardEntryView,
  LeaderboardPeriod,
} from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPlayerRow } from "@/ui/jo/jo-player-row";
import { JoProgressBar } from "@/ui/jo/jo-progress-bar";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { JoStat } from "@/ui/jo/jo-stat";
import { AppText } from "@/ui/text";
import { tierHex } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { TOPICS_HREF } from "@/lib/navigation";

type TopicTab = "board" | "progress" | "titles";

const TABS: { value: TopicTab; label: string }[] = [
  { value: "board", label: "Classement" },
  { value: "progress", label: "Progression" },
  { value: "titles", label: "Titres" },
];

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "MONTHLY", label: "Ce mois" },
  { value: "ALL_TIME", label: "Depuis toujours" },
];

const OUTCOME_LABEL: Record<GameHistoryOutcome, string> = {
  WIN: "Victoire",
  LOSS: "Défaite",
  DRAW: "Égalité",
  WAITING: "En attente",
  IN_PROGRESS: "En cours",
  CANCELLED: "Annulée",
};

function BoardRow({
  entry,
  period,
  last,
  highlight,
  onPress,
}: {
  entry: LeaderboardEntryView;
  period: LeaderboardPeriod;
  last: boolean;
  highlight?: boolean;
  onPress?: () => void;
}) {
  const xp = period === "MONTHLY" ? entry.monthlyXp : entry.totalXp;
  return (
    <JoPlayerRow
      name={entry.pseudonym ?? "Joueur"}
      avatarOptions={entry.avatarOptions}
      subtitle={entry.provisional ? "Provisoire" : `Elo ${entry.rating}`}
      rank={entry.rank}
      tier={entry.provisional ? null : eloTier(entry.rating)}
      highlight={highlight}
      last={last}
      onPress={onPress}
      trailing={
        <AppText variant="numeric" weight="semibold">
          {xp.toLocaleString("fr-FR")}
        </AppText>
      }
    />
  );
}

export function TopicDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useNativeTheme();
  const { colors } = theme;
  const { top } = useSafeAreaInsets();
  const me = useMe();
  const [tab, setTab] = useState<TopicTab>("board");
  const [period, setPeriod] = useState<LeaderboardPeriod>("MONTHLY");
  const [playOpen, setPlayOpen] = useState(false);
  const overviewQuery = useTopicOverview(id);
  const toggleFollow = useToggleTopicFollow(id);
  const gamesQuery = useTopicGames(me.data?.userId, { topicId: id });
  const leaderboardQuery = useTopicLeaderboard(id, { period, scope: "WORLD" });
  const language = me.data?.language ?? "fr";

  const back = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      onPress={() =>
        router.canGoBack()
          ? router.back()
          : router.replace(TOPICS_HREF)
      }
      style={({ pressed }) => [
        styles.back,
        { top: top + 4, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <CaretLeft size={20} color="#FFFFFF" />
    </Pressable>
  );

  if (overviewQuery.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <JoLoading />
      </View>
    );
  }

  if (!overviewQuery.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText variant="headline">Sujet introuvable</AppText>
        <AppButton
          label="Retour"
          variant="secondary"
          onPress={() => router.back()}
        />
      </View>
    );
  }

  const { topic, myProgress, titles } = overviewQuery.data;
  const name = topicName(topic.names, language);
  const category = topic.category
    ? categoryLabel(topic.category, topic.categoryLabel ?? undefined)
    : null;
  const heroImage = topic.bannerUrl ?? topic.imageUrl;
  const tint = topic.color ?? categoryColor(topic.category ?? "");
  const unlocked = myProgress.games > 0;
  const mastery = unlocked ? masteryTierLabel(myProgress.tier) : "—";
  const games = gamesQuery.data?.pages.flatMap((page) => page.content) ?? [];
  const entries =
    leaderboardQuery.data?.pages.flatMap((page) => page.entries.content) ?? [];
  const meEntry = leaderboardQuery.data?.pages[0]?.me ?? null;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scroll}
      >
        <View
          style={[
            styles.cover,
            { backgroundColor: heroImage ? colors.hover : tint },
          ]}
        >
          {heroImage ? (
            <Image
              source={{ uri: heroImage }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <AppText style={styles.emoji}>{topic.emoji?.trim() || "?"}</AppText>
          )}
          {back}
        </View>

        <View style={styles.head}>
          <View style={styles.titleRow}>
            <View style={styles.titleCopy}>
              {category ? (
                <AppText variant="caption" weight="semibold" tone="secondary">
                  {category}
                </AppText>
              ) : null}
              <AppText variant="largeTitle" weight="bold">
                {name}
              </AppText>
            </View>
            <AppButton
              label={topic.followed ? "Suivi" : "Suivre"}
              size="sm"
              variant="secondary"
              icon={
                topic.followed ? <Check size={16} color={colors.label} /> : undefined
              }
              loading={toggleFollow.isPending}
              onPress={() => toggleFollow.mutate(!topic.followed)}
            />
          </View>
          <AppButton
            label="Lancer un duel"
            size="lg"
            fullWidth
            icon={<Lightning size={20} color={colors.onAccent} weight="fill" />}
            onPress={() => setPlayOpen(true)}
          />
          <JoSegmented options={TABS} value={tab} onChange={setTab} />
        </View>

        <View style={styles.body}>
          {tab === "board" ? (
            <>
              <JoSegmented options={PERIODS} value={period} onChange={setPeriod} />
              {leaderboardQuery.isPending ? (
                <ActivityIndicator color={colors.accent} style={styles.spinner} />
              ) : entries.length === 0 ? (
                <AppText variant="callout" tone="secondary" style={styles.note}>
                  Le classement apparaîtra après les premiers duels.
                </AppText>
              ) : (
                <>
                  <View style={[styles.list, { backgroundColor: colors.surface }]}>
                    {entries.map((entry, index) => (
                      <BoardRow
                        key={`${entry.userId}-${entry.rank}`}
                        entry={entry}
                        period={period}
                        last={index === entries.length - 1}
                        onPress={() => router.push(`/player/${entry.userId}`)}
                      />
                    ))}
                  </View>
                  {meEntry ? (
                    <View style={[styles.list, { backgroundColor: colors.surface }]}>
                      <BoardRow entry={meEntry} period={period} last highlight />
                    </View>
                  ) : null}
                  {leaderboardQuery.hasNextPage ? (
                    <AppButton
                      label="Afficher plus"
                      variant="plain"
                      fullWidth
                      loading={leaderboardQuery.isFetchingNextPage}
                      onPress={() => void leaderboardQuery.fetchNextPage()}
                    />
                  ) : null}
                </>
              )}
            </>
          ) : null}

          {tab === "progress" ? (
            <>
              <View style={styles.stats}>
                <JoStat label="Maîtrise" value={mastery} />
                <JoStat
                  label="Abonnés"
                  value={compactNumber(topic.followersCount)}
                />
                <JoStat label="Questions" value={topic.questionsCount} />
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <JoProgressBar
                  label="Progression"
                  meta={`${myProgress.completedQuestions} / ${myProgress.totalQuestions}`}
                  value={myProgress.completionPercent}
                />
                <JoProgressBar
                  label={unlocked ? `Maîtrise · ${mastery}` : "Maîtrise"}
                  meta={
                    !unlocked
                      ? "Termine un duel entre joueurs"
                      : myProgress.nextTier
                        ? `${myProgress.tierRemainingXp.toLocaleString("fr-FR")} XP avant ${masteryTierLabel(myProgress.nextTier)}`
                        : "Palier maximal"
                  }
                  value={unlocked ? myProgress.tierProgressPercent : 0}
                  color={tierHex(myProgress.tier)}
                />
              </View>
              {games.length > 0 ? (
                <View style={styles.section}>
                  <JoSectionHeader title="Mes parties" />
                  <View style={[styles.list, { backgroundColor: colors.surface }]}>
                    {games.map((game, index) => (
                      <JoListRow
                        key={game.gameId}
                        label={OUTCOME_LABEL[game.outcome]}
                        sub={`Contre ${
                          game.opponent?.pseudonym ??
                          (game.opponentType === "BOT" ? "le bot" : "un joueur")
                        }`}
                        value={`${game.myScore} – ${game.opponentScore}`}
                        control="none"
                        last={index === games.length - 1}
                      />
                    ))}
                  </View>
                  {gamesQuery.hasNextPage ? (
                    <AppButton
                      label="Afficher plus"
                      variant="plain"
                      fullWidth
                      loading={gamesQuery.isFetchingNextPage}
                      onPress={() => void gamesQuery.fetchNextPage()}
                    />
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}

          {tab === "titles" ? (
            <TopicTitlesList
              titles={titles}
              progress={myProgress}
              language={language}
            />
          ) : null}
        </View>
      </ScrollView>

      <NativePlayModeModal
        visible={playOpen}
        onClose={() => setPlayOpen(false)}
        topicId={id}
        topicName={name}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  scroll: { paddingBottom: 32 },
  cover: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  emoji: { fontSize: 64, lineHeight: 76 },
  back: {
    position: "absolute",
    left: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  head: { gap: 12, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 12 },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  titleCopy: { flex: 1, minWidth: 0, gap: 4 },
  body: { gap: 16, paddingTop: 4, paddingHorizontal: 16 },
  section: { gap: 12 },
  stats: { flexDirection: "row", gap: 8 },
  card: { gap: 16, padding: 16, borderRadius: 16 },
  list: { borderRadius: 16, overflow: "hidden" },
  spinner: { paddingVertical: 32 },
  note: { textAlign: "center", paddingVertical: 24 },
});
