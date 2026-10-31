import { StyleSheet, View } from "react-native";
import { useNativeTheme } from "./theme";

interface NativeProgressBarProps {
  value: number;
  color?: string;
}

/** Barre de progression native (pas d'équivalent système simple). */
export function NativeProgressBar({ value, color }: NativeProgressBarProps) {
  const theme = useNativeTheme();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.track, { backgroundColor: theme.colors.fill }]}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: color ?? theme.colors.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
