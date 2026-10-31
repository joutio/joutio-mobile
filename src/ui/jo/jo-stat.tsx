import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoStatProps {
  label: string;
  value: string | number;
}

/** Statistique compacte : libellé puis valeur en Geist Mono. */
export function JoStat({ label, value }: JoStatProps) {
  const { colors } = useNativeTheme();
  return (
    <View style={[styles.stat, { backgroundColor: colors.surface }]}>
      <AppText
        variant="caption"
        tone="secondary"
        numberOfLines={2}
        style={styles.label}
      >
        {label}
      </AppText>
      <AppText variant="numeric" weight="semibold" numberOfLines={1} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  label: { textAlign: "center" },
  value: { fontSize: 20, lineHeight: 28 },
});
