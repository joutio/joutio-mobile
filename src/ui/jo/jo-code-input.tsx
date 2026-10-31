import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "../text";
import { useNativeTheme } from "../theme";

interface JoCodeInputProps {
  digits: string;
  length?: number;
  error?: boolean;
  onPress?: () => void;
}

/**
 * Port de `design/assets/components/Jo Code Input.dc.html`.
 * Cellules 56 h, radius 12, gap 8, Geist Mono 24/600, ring inset 2 px.
 */
export function JoCodeInput({
  digits,
  length = 6,
  error = false,
  onPress,
}: JoCodeInputProps) {
  const theme = useNativeTheme();
  const { colors } = theme;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Saisir le code de connexion"
      onPress={onPress}
      style={styles.row}
    >
      {Array.from({ length }, (_, index) => {
        const digit = digits[index] ?? "";
        const active = !error && index === digits.length;

        return (
          <View
            key={index}
            style={[styles.cell, { backgroundColor: colors.raised }]}
          >
            <View style={styles.cellContent}>
              {digit ? (
                <AppText
                  variant="numeric"
                  style={{ color: colors.label, fontSize: 24, lineHeight: 32 }}
                >
                  {digit}
                </AppText>
              ) : null}
              {active ? (
                <View style={[styles.caret, { backgroundColor: colors.accent }]} />
              ) : null}
            </View>

            {error || active ? (
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.ring,
                  { borderColor: error ? colors.danger : colors.accent },
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, width: "100%" },
  cell: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cellContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  caret: { width: 2, height: 24 },
  ring: { borderRadius: 12, borderWidth: 2 },
});
