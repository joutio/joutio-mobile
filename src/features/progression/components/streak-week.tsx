import { StyleSheet, View } from "react-native";
import { Check, Fire } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import type { WeekDay } from "../domain/streak";

const LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

interface StreakWeekProps {
  count: number;
  hint: string;
  week: WeekDay[];
}

/** Série en cours et semaine, du lundi au dimanche. */
export function StreakWeek({ count, hint, week }: StreakWeekProps) {
  const { colors } = useNativeTheme();
  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View
          style={[
            styles.fire,
            { backgroundColor: count > 0 ? colors.accentSoft : colors.raised },
          ]}
        >
          <Fire
            size={24}
            color={count > 0 ? colors.accent : colors.secondaryLabel}
            weight="fill"
          />
        </View>
        <View style={styles.copy}>
          <AppText variant="numeric" weight="semibold" style={styles.count}>
            {count} {count > 1 ? "jours" : "jour"}
          </AppText>
          <AppText variant="footnote" tone="secondary">
            {hint}
          </AppText>
        </View>
      </View>
      <View style={styles.week}>
        {week.map((day, index) => (
          <View key={index} style={styles.day}>
            <AppText variant="caption" weight="semibold" tone="secondary">
              {LETTERS[index]}
            </AppText>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: day === "done" ? colors.accent : colors.raised,
                  borderWidth: day === "today" ? 2 : 0,
                  borderColor: colors.accent,
                },
              ]}
            >
              {day === "done" ? (
                <Check size={16} color={colors.onAccent} weight="bold" />
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 12 },
  fire: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  count: { fontSize: 24, lineHeight: 32 },
  week: { flexDirection: "row", justifyContent: "space-between" },
  day: { alignItems: "center", gap: 4 },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
