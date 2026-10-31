import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { JoBadge } from "@/ui/jo/jo-badge";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoProgressBar } from "@/ui/jo/jo-progress-bar";
import { JoStat } from "@/ui/jo/jo-stat";
import { AppText } from "@/ui/text";
import { tierHex, tierLabel } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { familyIcon } from "./components/family-icon";
import { StreakWeek } from "./components/streak-week";
import { monthGrid, weekDays } from "./domain/streak";
import { useActivity, useBadges } from "./hooks/useProgression";

const HEADS = ["L", "M", "M", "J", "V", "S", "D"];

export function StreakScreen() {
  const { colors } = useNativeTheme();
  const me = useMe();
  const activity = useActivity(me.data?.userId);
  const badges = useBadges(me.data?.userId);
  const data = activity.data;
  const active = useMemo(
    () =>
      new Set(
        data?.days.filter((day) => day.games > 0).map((day) => day.date) ?? [],
      ),
    [data],
  );
  const now = new Date();
  const month = monthGrid(active, now);
  const nextBadge = badges.data?.families
    .find((family) => family.family === "ASSIDUITY")
    ?.badges.find((badge) => !badge.earned);

  if (!data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <JoLoading />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <StreakWeek
          count={data.currentStreak}
          hint={`Joue un duel aujourd'hui pour passer à ${data.currentStreak + 1}`}
          week={weekDays(active, now)}
        />
      </View>

      <View style={styles.stats}>
        <JoStat label="En cours" value={data.currentStreak} />
        <JoStat label="Record" value={data.longestStreak} />
        <JoStat label="Jours actifs" value={data.totalActiveDays} />
      </View>

      <View style={[styles.card, styles.calendar, { backgroundColor: colors.surface }]}>
        <View style={styles.monthHead}>
          <AppText variant="body" weight="semibold" style={styles.month}>
            {month.label}
          </AppText>
          <AppText variant="footnote" tone="secondary">
            {month.activeCount} jours actifs
          </AppText>
        </View>
        <View style={styles.grid}>
          {HEADS.map((head, index) => (
            <View key={index} style={styles.cell}>
              <AppText variant="caption" weight="semibold" tone="secondary">
                {head}
              </AppText>
            </View>
          ))}
          {month.cells.map((cell, index) => (
            <View key={index} style={styles.cell}>
              {cell.day ? (
                <View
                  style={[
                    styles.date,
                    {
                      backgroundColor: cell.active
                        ? colors.accent
                        : "transparent",
                      borderWidth: cell.today ? 2 : 0,
                      borderColor: colors.accent,
                    },
                  ]}
                >
                  <AppText
                    variant="numeric"
                    weight="semibold"
                    style={[
                      styles.dateText,
                      {
                        color: cell.active
                          ? colors.onAccent
                          : colors.secondaryLabel,
                      },
                    ]}
                  >
                    {cell.day}
                  </AppText>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      {nextBadge ? (
        <View style={[styles.card, styles.badge, { backgroundColor: colors.surface }]}>
          <JoBadge
            tier={nextBadge.tier}
            size={48}
            state="progress"
            icon={familyIcon("ASSIDUITY")}
          />
          <View style={styles.copy}>
            <JoProgressBar
              label={`${nextBadge.label} · ${tierLabel(nextBadge.tier)}`}
              meta={`${nextBadge.progress} / ${nextBadge.target} jours`}
              value={(nextBadge.progress / nextBadge.target) * 100}
              color={tierHex(nextBadge.tier)}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  card: { padding: 16, borderRadius: 16 },
  stats: { flexDirection: "row", gap: 8 },
  calendar: { gap: 8 },
  monthHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  month: { textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  date: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { fontSize: 12, lineHeight: 16 },
  badge: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, minWidth: 0 },
});
