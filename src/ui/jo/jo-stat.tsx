import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoStatProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "accent" | "neutral" | "ghost";
  surface?: "surface" | "raised" | "warm";
  compact?: boolean;
}

/** Statistique de `Jo Stat` : libellé, valeur en Geist Mono et tendance. */
export function JoStat({
  label,
  value,
  sub,
  icon,
  trend = "neutral",
  surface = "surface",
  compact = true,
}: JoStatProps) {
  const { colors } = useNativeTheme();
  const valueColor = {
    up: colors.success,
    down: colors.danger,
    accent: colors.accentInk,
    neutral: colors.label,
    ghost: colors.secondaryLabel,
  }[trend];
  return (
    <View
      style={[
        styles.stat,
        compact ? styles.compact : styles.regular,
        { backgroundColor: colors[surface] },
      ]}
    >
      <View style={[styles.head, compact && styles.compactHead]}>
        {icon}
        <AppText
          variant="footnote"
          tone="secondary"
          numberOfLines={compact ? 2 : 1}
          style={compact && styles.center}
        >
          {label}
        </AppText>
      </View>
      <AppText
        variant="numeric"
        weight="semibold"
        numberOfLines={1}
        style={[styles.value, { color: valueColor }]}
      >
        {value}
      </AppText>
      {sub ? (
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flex: 1, minWidth: 0, gap: 4, borderRadius: 12 },
  compact: { alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 },
  regular: { padding: 12 },
  head: { flexDirection: "row", alignItems: "center", gap: 4 },
  compactHead: { minHeight: 32 },
  center: { textAlign: "center" },
  value: { fontSize: 20, lineHeight: 28 },
});
