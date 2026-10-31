import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoIconButtonProps {
  icon: ReactNode;
  label: string;
  onPress?: () => void;
  /** Pastille rouge sans compteur. */
  dot?: boolean;
  /** Compteur ambre, prioritaire sur `dot`. */
  count?: number;
}

/** Bouton icône 44 px, variante `plain` du design system. */
export function JoIconButton({
  icon,
  label,
  onPress,
  dot = false,
  count = 0,
}: JoIconButtonProps) {
  const { colors } = useNativeTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { opacity: pressed ? 0.5 : 1 }]}
    >
      {icon}
      {count > 0 ? (
        <View
          style={[
            styles.count,
            { backgroundColor: colors.accent, borderColor: colors.background },
          ]}
        >
          <AppText variant="caption" weight="semibold" style={styles.countText}>
            {count > 9 ? "9+" : count}
          </AppText>
        </View>
      ) : dot ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: colors.danger, borderColor: colors.background },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  count: {
    position: "absolute",
    top: 0,
    right: -2,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 4,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: { color: "#000000" },
});
