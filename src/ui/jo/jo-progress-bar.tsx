import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoProgressBarProps {
  value: number;
  label?: string;
  meta?: string;
  color?: string;
}

/** Barre de progression plate, avec libellé et valeur facultatifs. */
export function JoProgressBar({ value, label, meta, color }: JoProgressBarProps) {
  const { colors } = useNativeTheme();
  const percent = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      style={styles.root}
    >
      {label || meta ? (
        <View style={styles.head}>
          <AppText variant="caption" weight="semibold" numberOfLines={1}>
            {label}
          </AppText>
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {meta}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.track, { backgroundColor: colors.hover }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${percent}%`,
              backgroundColor: color ?? colors.accent,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 8 },
  head: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  track: { height: 6 },
  fill: { height: "100%" },
});
