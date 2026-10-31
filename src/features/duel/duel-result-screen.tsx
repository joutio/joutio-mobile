import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CaretUp, Flag, Lightning, X } from "@/ui/phosphor";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { UnlockCeremony } from "@/features/progression/components/unlock-ceremony";
import { collectUnlocks, type Unlock } from "@/features/progression/domain/unlocks";
import { useBadges } from "@/features/progression/hooks/useProgression";
import { queryKeys } from "@/lib/query-keys";
import { ReportPlayerSheet } from "@/features/moderation/report-player-sheet";
import { useTopicOverview } from "@/features/topic/hooks/useTopicDetail";
import { haptic } from "@/lib/haptics";
import { challengesService } from "@/lib/services/challenges";
import { showToast } from "@/lib/toast";
import { eloTier } from "@/shared/utils/elo";
import { masteryTierLabel } from "@/shared/utils/mastery";
import { topicName } from "@/shared/utils/topic-name";
import { AppButton } from "@/ui/button";
import { JoBanner } from "@/ui/jo/jo-banner";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoStat } from "@/ui/jo/jo-stat";
import { AppText } from "@/ui/text";
import { EASE, riseIn } from "@/ui/motion";
import { DarkTheme, useNativeTheme } from "@/ui/theme";
import { DuelReviewSheet } from "./components/duel-review-sheet";
import { MasteryRing } from "./components/mastery-ring";
import { RoundDots } from "./components/round-dots";
import { roundDots } from "./domain/game";
import { useGameResult } from "./hooks/useGameResult";
import { useGameState } from "./hooks/useGameState";
import { useStartMatchmaking } from "./hooks/useMatchmaking";
import { useStartBotRoom } from "./hooks/useRoom";
import { CHALLENGES_HREF, leaveDuelFlow } from "@/lib/navigation";

function Rise({ order, children }: { order: number; children: React.ReactNode }) {
  return (
    <Animated.View
      style={{
        animationName: riseIn,
        animationDuration: 400,
        animationDelay: order * 90,
        animationTimingFunction: EASE,
        animationFillMode: "both",
      }}
    >
      {children}
    </Animated.View>
  );
}

function Result() {
  const { gameId = "" } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useNativeTheme();
  const me = useMe();
  const resultQuery = useGameResult(gameId);
  const { game } = useGameState(gameId);
  const replay = useStartBotRoom({ replace: true });
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const queryClient = useQueryClient();
  const collection = useBadges(me.data?.userId);
  const rewarded = Boolean(resultQuery.data?.reward);
  const finalRating = resultQuery.data?.progression.rating;
  const humanGame = resultQuery.data?.botGame === false;

  // La récompense projetée, on relit la collection puis on compare au dernier état vu.
  useEffect(() => {
    if (!rewarded || !me.data?.userId) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.profiles.badges(me.data.userId),
    });
  }, [me.data?.userId, queryClient, rewarded]);

  useEffect(() => {
    const userId = me.data?.userId;
    if (
      !humanGame ||
      !rewarded ||
      !userId ||
      !collection.data ||
      collection.isFetching ||
      finalRating === undefined
    ) {
      return;
    }
    void collectUnlocks(userId, collection.data, finalRating).then(setUnlocks);
  }, [
    collection.data,
    collection.isFetching,
    finalRating,
    humanGame,
    me.data?.userId,
    rewarded,
  ]);
  const nextOpponent = useStartMatchmaking({ replace: true });
  const overview = useTopicOverview(resultQuery.data?.topic.topicId ?? "");
  const rematch = useMutation({
    mutationFn: challengesService.create,
    onSuccess: () => {
      haptic("success");
      showToast({ title: "Revanche proposée", tone: "success" });
      leaveDuelFlow(router);
      router.navigate(CHALLENGES_HREF);
    },
    onError: () =>
      showToast({ title: "Revanche impossible, réessaie.", tone: "danger" }),
  });

  const winnerId = resultQuery.data?.winnerId;
  const decided = winnerId !== undefined && winnerId !== null && !!me.data;
  const victory = winnerId === me.data?.userId;
  useEffect(() => {
    if (decided) haptic(victory ? "success" : "error");
  }, [decided, victory]);

  if (resultQuery.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <JoLoading />
        <AppText variant="callout" tone="secondary">
          Chargement du résultat…
        </AppText>
      </View>
    );
  }

  if (!resultQuery.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText variant="headline">Résultat indisponible</AppText>
        <AppButton
          label="Réessayer"
          variant="secondary"
          onPress={() => void resultQuery.refetch()}
        />
      </View>
    );
  }

  const result = resultQuery.data;
  const language = me.data?.language ?? "fr";
  const userId = me.data?.userId ?? null;
  const won = result.winnerId !== null && result.winnerId === userId;
  const draw = result.winnerId === null;
  const opponentName =
    result.opponent?.pseudonym ?? (result.botGame ? "Bot" : "Adversaire");
  const topicId = result.topic.topicId;
  const progress = overview.data?.myProgress;
  const opponentId = result.opponentId;
  const outcomeColor = won
    ? colors.accentInk
    : draw
      ? colors.label
      : colors.danger;
  const scoreColor = (mine: number, other: number) =>
    mine > other ? colors.success : mine < other ? colors.danger : colors.label;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        {!result.botGame && result.opponentId ? (
          <JoIconButton
            label={`Signaler ${opponentName}`}
            icon={<Flag size={24} color={colors.label} />}
            onPress={() => setReportOpen(true)}
          />
        ) : (
          <View />
        )}
        <JoIconButton
          label="Quitter les résultats"
          icon={<X size={24} color={colors.label} />}
          onPress={() => leaveDuelFlow(router)}
        />
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Rise order={0}>
        <View style={styles.heading}>
          <AppText weight="bold" style={[styles.outcome, { color: outcomeColor }]}>
            {draw ? "Égalité" : won ? "Victoire" : "Défaite"}
          </AppText>
          <AppText variant="callout" tone="secondary">
            {topicName(result.topic.names, language)}
          </AppText>
        </View>
        </Rise>

        <Rise order={1}>
        <View style={styles.scores}>
          <JoEloAvatar
            name={me.data?.pseudonym ?? "Toi"}
            avatarOptions={me.data?.avatarOptions}
            size={72}
            tier={
              result.progression.provisional
                ? null
                : eloTier(result.progression.rating)
            }
          />
          <View style={styles.scoreRow}>
            <AppText
              variant="numeric"
              weight="semibold"
              style={[
                styles.score,
                { color: scoreColor(result.myScore, result.opponentScore) },
              ]}
            >
              {result.myScore}
            </AppText>
            <Lightning size={24} color={colors.accent} weight="fill" />
            <AppText
              variant="numeric"
              weight="semibold"
              style={[
                styles.score,
                { color: scoreColor(result.opponentScore, result.myScore) },
              ]}
            >
              {result.opponentScore}
            </AppText>
          </View>
          <JoEloAvatar
            name={opponentName}
            avatarOptions={result.opponent?.avatarOptions}
            size={72}
            tier={
              result.opponentRated ? eloTier(result.opponentRating) : null
            }
          />
        </View>
        </Rise>

        <Rise order={2}>
        <View style={styles.players}>
          <View style={styles.player}>
            <AppText variant="body" weight="semibold">
              Toi
            </AppText>
            <AppText variant="footnote" tone="secondary">
              Elo {result.progression.rating}
              {result.botGame ? " · non classé" : ""}
            </AppText>
            <RoundDots dots={roundDots(game, userId)} size={10} />
          </View>
          <AppText variant="caption" weight="semibold" tone="secondary">
            vs
          </AppText>
          <View style={styles.player}>
            <AppText variant="body" weight="semibold" numberOfLines={1}>
              {opponentName}
            </AppText>
            <AppText variant="footnote" tone="secondary">
              {result.botGame ? "non classé" : `Elo ${result.opponentRating}`}
            </AppText>
            <RoundDots dots={roundDots(game, opponentId)} size={10} />
          </View>
        </View>
        </Rise>

        <Rise order={3}>
        <View style={styles.stats}>
          <JoStat label="Score du match" value={result.basePoints} trend="accent" />
          <JoStat label="Bonus rapidité" value={`+${result.speedBonus}`} trend="up" />
          <JoStat
            label="Bonus victoire"
            trend="up"
            value={
              result.reward ? `+${result.reward.victoryBonus}` : "…"
            }
          />
        </View>
        </Rise>

        <Rise order={4}>
        {result.botGame ? (
          <JoBanner
            tone="training"
            title="Entraînement"
            message="Pas d'expérience : la progression vient des duels entre joueurs."
          />
        ) : result.reward && progress ? (
          <MasteryRing
            tier={masteryTierLabel(progress.tier)}
            percent={progress.tierProgressPercent}
            gained={result.reward.xp}
            nextLabel={
              progress.nextTier ? masteryTierLabel(progress.nextTier) : undefined
            }
            remaining={progress.tierRemainingXp}
          />
        ) : (
          <JoLoading />
        )}
        </Rise>

        <Rise order={5}>
        <View style={styles.actions}>
          {result.botGame ? (
            <AppButton
              label="Rejouer"
              size="lg"
              fullWidth
              style={styles.action}
              icon={<Lightning size={20} color={colors.onAccent} weight="fill" />}
              loading={replay.isPending}
              onPress={() =>
                replay.mutate({
                  topicId,
                  difficulty: result.botDifficulty ?? "NORMAL",
                })
              }
            />
          ) : opponentId ? (
            <AppButton
              label="Revanche"
              size="lg"
              fullWidth
              style={styles.action}
              icon={<Lightning size={20} color={colors.onAccent} weight="fill" />}
              loading={rematch.isPending}
              onPress={() => rematch.mutate({ topicId, opponentId, gameId })}
            />
          ) : null}
          <AppButton
            label="Nouvel adversaire"
            variant="secondary"
            size="lg"
            fullWidth
            style={styles.action}
            loading={nextOpponent.isPending}
            onPress={() => nextOpponent.mutate(topicId)}
          />
        </View>
        </Rise>
        <AppButton
          label="Détails"
          variant="plain"
          icon={<CaretUp size={20} color={colors.secondaryLabel} />}
          style={styles.details}
          onPress={() => setReviewOpen(true)}
        />
      </ScrollView>
      <DuelReviewSheet
        visible={reviewOpen}
        onClose={() => setReviewOpen(false)}
        game={game}
        meId={userId}
        opponentId={opponentId}
        language={language}
      />
      <UnlockCeremony
        unlocks={unlocks}
        name={me.data?.pseudonym ?? "Joueur"}
        avatarOptions={me.data?.avatarOptions}
        onDone={() => setUnlocks([])}
      />
      {result.opponentId ? (
        <ReportPlayerSheet
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          userId={result.opponentId}
          name={opponentName}
          gameId={gameId}
        />
      ) : null}
    </View>
  );
}

export function DuelResultScreen() {
  return (
    <DarkTheme value>
      <StatusBar style="light" />
      <Result />
    </DarkTheme>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  top: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  details: { alignSelf: "center" },
  content: { flexGrow: 1, justifyContent: "space-between", gap: 16, paddingHorizontal: 16 },
  heading: { alignItems: "center", gap: 4 },
  outcome: { fontSize: 48, lineHeight: 48, letterSpacing: -1.92 },
  scores: { flexDirection: "row", alignItems: "center", gap: 12 },
  scoreRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  score: { fontSize: 48, lineHeight: 48 },
  players: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  player: { flex: 1, minWidth: 0, alignItems: "center", gap: 4 },
  stats: { flexDirection: "row", gap: 8 },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, paddingHorizontal: 8 },
});
