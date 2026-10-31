import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Lightning, MapPin } from "@/ui/phosphor";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { ReportPlayerSheet } from "@/features/moderation/report-player-sheet";
import { titleName, useTitles } from "@/features/progression/hooks/useProgression";
import { ChallengeTopicSheet } from "@/features/challenges/components/challenge-topic-sheet";
import {
  useHeadToHead,
  usePlayer,
  useToggleFollow,
} from "@/features/social/hooks/usePeople";
import { queryKeys } from "@/lib/query-keys";
import { profileGamesService } from "@/lib/services/profile-games";
import { eloTier } from "@/shared/utils/elo";
import { topicName } from "@/shared/utils/topic-name";
import type { GameHistoryOutcome } from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPill } from "@/ui/jo/jo-pill";
import { JoTitleRibbon } from "@/ui/jo/jo-title-ribbon";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoStat } from "@/ui/jo/jo-stat";
import { AppText } from "@/ui/text";
import { tierLabel } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";

const OUTCOME: Partial<Record<GameHistoryOutcome, string>> = {
  WIN: "Victoire",
  LOSS: "Défaite",
  DRAW: "Égalité",
};

const RECENT_GAMES = 3;

function lastSeen(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const minutes = Math.floor((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 60) return `Vu il y a ${Math.max(1, minutes)} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vu il y a ${hours} h`;
  return `Vu il y a ${Math.floor(hours / 24)} j`;
}

export function PlayerScreen() {
  const { id = "" } = useLocalSearchParams<{ id: string }>();
  const { colors } = useNativeTheme();
  const me = useMe();
  const player = usePlayer(id);
  const toggleFollow = useToggleFollow(id);
  const [challenging, setChallenging] = useState(false);
  const [reporting, setReporting] = useState(false);
  const myId = me.data?.userId;
  const titles = useTitles(id);
  const headToHead = useHeadToHead(myId, id);
  const params = { opponentId: id, size: RECENT_GAMES };
  const games = useInfiniteQuery({
    queryKey: queryKeys.profiles.games(myId ?? "", params),
    queryFn: () => profileGamesService.list(myId ?? "", params),
    initialPageParam: 0,
    getNextPageParam: () => undefined,
    enabled: !!myId && !!id,
  });

  if (player.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <JoLoading />
      </View>
    );
  }

  if (!player.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText variant="headline">Joueur introuvable</AppText>
        <AppButton
          label="Réessayer"
          variant="secondary"
          onPress={() => void player.refetch()}
        />
      </View>
    );
  }

  const data = player.data;
  const { rating, provisional } = data.progression;
  const tier = eloTier(rating);
  const status = data.presence?.status;
  const presenceLabel =
    status === "ONLINE" ? "En ligne" : lastSeen(data.presence?.lastSeenAt);
  const recent = games.data?.pages[0]?.content ?? [];
  const language = me.data?.language ?? "fr";
  const canAct = !data.isMe && !data.bot;
  const equipped = titles.data?.titles.find(
    (title) => title.key === titles.data.equippedKey,
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.identity}>
        <JoEloAvatar
          name={data.pseudonym}
          avatarOptions={data.avatarOptions}
          size={96}
          tier={provisional ? null : tier}
        />
        <AppText variant="title1" weight="bold" style={styles.centered}>
          {data.pseudonym}
        </AppText>
        {equipped ? (
          <JoTitleRibbon
            tier={equipped.tier}
            text={titleName(equipped, language)}
            width={200}
          />
        ) : null}
        <View style={styles.pills}>
          {provisional ? (
            <JoPill label={`Provisoire · ${rating}`} />
          ) : (
            <JoPill tier={tier} label={`${tierLabel(tier)} · ${rating}`} />
          )}
          {data.country ? (
            <JoPill
              label={data.country}
              icon={<MapPin size={14} color={colors.secondaryLabel} />}
            />
          ) : null}
          {data.suspended ? <JoPill label="Compte suspendu" /> : null}
        </View>
        {presenceLabel ? (
          <AppText variant="footnote" tone="secondary">
            {presenceLabel}
          </AppText>
        ) : null}
      </View>

      {canAct ? (
        <View style={styles.actions}>
          <AppButton
            label="Défier"
            size="lg"
            fullWidth
            style={styles.action}
            disabled={data.suspended}
            icon={<Lightning size={20} color={colors.onAccent} weight="fill" />}
            onPress={() => setChallenging(true)}
          />
          <AppButton
            label={data.following ? "Suivi" : "Suivre"}
            variant="secondary"
            size="lg"
            fullWidth
            style={styles.action}
            loading={toggleFollow.isPending}
            onPress={() => toggleFollow.mutate(!data.following)}
          />
        </View>
      ) : null}

      {canAct ? (
        <View style={styles.section}>
          <JoSectionHeader title={`Tes duels contre ${data.pseudonym}`} />
          <View style={styles.stats}>
            <JoStat label="Victoires" value={headToHead.data?.wins ?? "—"} />
            <JoStat label="Nuls" value={headToHead.data?.draws ?? "—"} />
            <JoStat label="Défaites" value={headToHead.data?.losses ?? "—"} />
          </View>
          {recent.length > 0 ? (
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {recent.map((game, index) => (
                <JoListRow
                  key={game.gameId}
                  label={topicName(game.topic.names, language)}
                  sub={OUTCOME[game.outcome] ?? "Partie"}
                  value={`${game.myScore} · ${game.opponentScore}`}
                  control="none"
                  last={index === recent.length - 1}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {canAct ? (
        <AppButton
          label="Signaler ce joueur"
          variant="plain"
          style={styles.report}
          onPress={() => setReporting(true)}
        />
      ) : null}

      <ChallengeTopicSheet
        player={challenging ? data : null}
        onClose={() => setChallenging(false)}
      />
      <ReportPlayerSheet
        visible={reporting}
        onClose={() => setReporting(false)}
        userId={data.userId}
        name={data.pseudonym}
      />
    </ScrollView>
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
  content: { gap: 16, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  identity: { alignItems: "center", gap: 8 },
  centered: { textAlign: "center" },
  pills: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, paddingHorizontal: 8 },
  report: { alignSelf: "center" },
  section: { gap: 12 },
  stats: { flexDirection: "row", gap: 8 },
  list: { borderRadius: 16, overflow: "hidden" },
});
