import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoSectionHeaderProps {
  title: string;
  count?: string;
  action?: string;
  onAction?: () => void;
}

/** Titre de section, compteur en Geist Mono et action texte. */
export function JoSectionHeader({
  title,
  count,
  action,
  onAction,
}: JoSectionHeaderProps) {
  const { colors } = useNativeTheme();
  return (
    <View style={styles.row}>
      <View style={styles.title}>
        <AppText variant="title2" weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        {count ? (
          <AppText variant="numeric" tone="secondary" style={styles.count}>
            {count}
          </AppText>
        ) : null}
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <AppText
            variant="callout"
            weight="semibold"
            style={{ color: colors.accentInk }}
          >
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  title: { flexShrink: 1, flexDirection: "row", alignItems: "baseline", gap: 8 },
  count: { fontSize: 14, lineHeight: 20 },
});
