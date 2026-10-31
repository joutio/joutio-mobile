import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { haptic } from "@/lib/haptics";
import type { BadgeFamilyView, BadgeItemView } from "@/shared/types/bff";
import { JoBadge } from "@/ui/jo/jo-badge";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoProgressBar } from "@/ui/jo/jo-progress-bar";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { AppText } from "@/ui/text";
import { tierHex, tierLabel } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import { FAMILY_LABEL, familyIcon } from "./components/family-icon";
import { useBadges } from "./hooks/useProgression";

type Filter = "all" | "earned" | "progress";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "earned", label: "Acquis" },
  { value: "progress", label: "En cours" },
];

interface Selection {
  family: BadgeFamilyView;
  badge: BadgeItemView;
}

function familySummary(family: BadgeFamilyView) {
  const next = family.badges.find((badge) => !badge.earned) ?? null;
  const last = family.badges.filter((badge) => badge.earned).at(-1) ?? null;
  return { next, last };
}

export function BadgesScreen() {
  const { colors } = useNativeTheme();
  const me = useMe();
  const badges = useBadges(me.data?.userId);
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Selection | null>(null);

  const families = useMemo(
    () =>
      (badges.data?.families ?? []).filter((family) => {
        const { next, last } = familySummary(family);
        if (filter === "earned") return last !== null;
        return filter === "progress" ? next !== null : true;
      }),
    [badges.data, filter],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <JoSegmented options={FILTERS} value={filter} onChange={setFilter} />
          {badges.data ? (
            <AppText variant="callout" tone="secondary">
              {badges.data.earnedCount} acquis sur {badges.data.totalCount} ·{" "}
              {badges.data.families.length} familles
            </AppText>
          ) : null}
        </View>

        {badges.isPending ? <JoLoading /> : null}

        {families.map((family) => {
          const { next, last } = familySummary(family);
          const icon = familyIcon(family.family);
          return (
            <View
              key={family.family}
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              <View style={styles.cardHead}>
                <AppText variant="body" weight="semibold">
                  {FAMILY_LABEL[family.family] ?? family.family}
                </AppText>
                <AppText variant="footnote" tone="secondary">
                  {next
                    ? `${last ? tierLabel(last.tier) : "Départ"} · ${next.progress} / ${next.target}`
                    : "Complète"}
                </AppText>
              </View>
              <View style={styles.tiers}>
                {family.badges.map((badge) => (
                  <Pressable
                    key={badge.code}
                    accessibilityRole="button"
                    accessibilityLabel={`${badge.label}, ${tierLabel(badge.tier)}`}
                    hitSlop={4}
                    onPress={() => {
                      haptic("selection");
                      setSelected({ family, badge });
                    }}
                  >
                    <JoBadge
                      tier={badge.tier}
                      size={40}
                      icon={icon}
                      state={
                        badge.earned
                          ? "earned"
                          : badge === next
                            ? "progress"
                            : "locked"
                      }
                    />
                  </Pressable>
                ))}
              </View>
              {next ? (
                <JoProgressBar
                  value={(next.progress / next.target) * 100}
                  color={tierHex(next.tier)}
                />
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <JoSheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title={selected?.badge.label ?? ""}
        subtitle={
          selected
            ? `${FAMILY_LABEL[selected.family.family] ?? selected.family.family} · ${tierLabel(selected.badge.tier)}`
            : undefined
        }
      >
        {selected ? (
          <ScrollView nestedScrollEnabled style={styles.sheet}>
            <View style={styles.sheetContent}>
              <JoBadge
                tier={selected.badge.tier}
                size={112}
                icon={familyIcon(selected.family.family)}
                state={selected.badge.earned ? "earned" : "progress"}
              />
              <View style={[styles.ladder, { backgroundColor: colors.raised }]}>
                {selected.family.badges.map((badge, index) => (
                  <JoListRow
                    key={badge.code}
                    label={tierLabel(badge.tier)}
                    sub={badge.label}
                    value={
                      badge.earned ? "Acquis" : `${badge.progress} / ${badge.target}`
                    }
                    control="none"
                    last={index === selected.family.badges.length - 1}
                  />
                ))}
              </View>
            </View>
          </ScrollView>
        ) : null}
      </JoSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  head: { gap: 8, paddingBottom: 4 },
  card: { gap: 12, paddingTop: 12, paddingHorizontal: 16, paddingBottom: 16, borderRadius: 16 },
  cardHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  tiers: { flexDirection: "row", justifyContent: "space-between" },
  sheet: { maxHeight: 520 },
  sheetContent: { alignItems: "center", gap: 12, paddingHorizontal: 16 },
  ladder: { alignSelf: "stretch", borderRadius: 12, overflow: "hidden" },
});
