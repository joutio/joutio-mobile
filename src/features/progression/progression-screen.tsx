import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { Crown, Medal } from "@/ui/phosphor";
import { useMe } from "@/features/auth/hooks/useMe";
import {
  ELO_LADDER,
  eloProgressPercent,
  eloTier,
  nextEloTier,
} from "@/shared/utils/elo";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoProgressBar } from "@/ui/jo/jo-progress-bar";
import { JoStat } from "@/ui/jo/jo-stat";
import { AppText } from "@/ui/text";
import { tierHex, tierLabel } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { useBadges, useTitles } from "./hooks/useProgression";

export function ProgressionScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const me = useMe();
  const badges = useBadges(me.data?.userId);
  const titles = useTitles(me.data?.userId);

  if (!me.data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <JoLoading />
      </View>
    );
  }

  const { rating, peakRating } = me.data.progression;
  const { stats, pseudonym } = me.data;
  const tier = eloTier(rating);
  const next = nextEloTier(rating);
  const reached = ELO_LADDER.indexOf(tier);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.ladder}>
        {ELO_LADDER.map((step, index) => {
          const current = step === tier;
          return (
            <View
              key={step}
              style={[styles.step, { opacity: index > reached ? 0.35 : 1 }]}
            >
              <JoEloAvatar
                name={pseudonym}
                avatarOptions={me.data.avatarOptions}
                size={current ? 56 : 36}
                tier={step}
              />
              <AppText
                variant="caption"
                weight={current ? "semibold" : "regular"}
                tone={current ? "default" : "secondary"}
                numberOfLines={1}
                style={styles.stepLabel}
              >
                {current ? tierLabel(step) : ""}
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <JoProgressBar
          label={`${tierLabel(tier)} · ${rating}`}
          meta={next ? `${tierLabel(next.tier)} à ${next.min}` : "Rang maximal"}
          value={eloProgressPercent(rating)}
          color={tierHex(tier)}
        />
        <AppText variant="callout" tone="secondary">
          {next ? `${next.min - rating} Elo à gagner. ` : ""}Pic : {peakRating}.
        </AppText>
      </View>

      <View style={styles.stats}>
        <JoStat label="Victoires" value={`${Math.round(stats.winPercent)} %`} />
        <JoStat label="Série record" value={stats.bestWinStreak} />
        <JoStat label="Meilleur score" value={stats.bestScore} />
      </View>

      <View style={[styles.list, { backgroundColor: colors.surface }]}>
        <JoListRow
          label="Badges"
          icon={<Medal size={20} color={colors.secondaryLabel} />}
          value={
            badges.data
              ? `${badges.data.earnedCount} / ${badges.data.totalCount}`
              : undefined
          }
          onPress={() => router.push("/me/badges")}
        />
        <JoListRow
          label="Titres"
          icon={<Crown size={20} color={colors.secondaryLabel} />}
          value={titles.data?.titles.length}
          last
          onPress={() => router.push("/me/titles")}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  ladder: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  step: { alignItems: "center", gap: 4 },
  stepLabel: { maxWidth: 64 },
  card: { gap: 12, padding: 16, borderRadius: 16 },
  stats: { flexDirection: "row", gap: 8 },
  list: { borderRadius: 16, overflow: "hidden" },
});
