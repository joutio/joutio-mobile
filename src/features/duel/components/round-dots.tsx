import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import type { RoundDot } from "../domain/game";

const FILL: Record<RoundDot, string> = {
  correct: "#4FB286",
  wrong: "#E5645A",
  current: "transparent",
  upcoming: "#1C1C22",
  bonus: "transparent",
  bonusCorrect: "#4FB286",
  bonusWrong: "#E5645A",
};

const RING: Partial<Record<RoundDot, string>> = {
  current: "#FFFFFF",
  bonus: "#E8B04A",
  bonusCorrect: "#E8B04A",
  bonusWrong: "#E8B04A",
};

/** Bilan des manches : vert juste, rouge faux, cerclé ambre pour le bonus. */
export function RoundDots({ dots, size = 24 }: { dots: RoundDot[]; size?: number }) {
  return (
    <View
      accessibilityLabel="Manches"
      style={[styles.row, { gap: size >= 20 ? 8 : 4 }]}
    >
      {dots.map((dot, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: FILL[dot],
              borderWidth: RING[dot] ? 2 : 0,
              borderColor: RING[dot],
            },
          ]}
        >
          {dot === "bonus" && size >= 20 ? (
            <AppText variant="caption" weight="bold" style={styles.bonus}>
              ×2
            </AppText>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  dot: { alignItems: "center", justifyContent: "center" },
  bonus: { color: "#E8B04A", fontSize: 10, lineHeight: 12 },
});
