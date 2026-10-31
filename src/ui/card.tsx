import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import type { ReactNode } from "react";
import { AppText } from "./text";
import { useNativeTheme } from "./theme";

interface AppCardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}

/** Carte Joutio : surface plate, rayon 16. */
export function AppCard({ children, onPress, style, padded = true }: AppCardProps) {
  const theme = useNativeTheme();
  const { colors, radius } = theme;
  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: padded ? 16 : 0,
    },
    style,
  ];

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [cardStyle, { opacity: pressed ? 0.8 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

interface SectionProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function AppSection({ title, action, children, style }: SectionProps) {
  const theme = useNativeTheme();
  const { spacing } = theme;
  return (
    <View style={[{ gap: spacing.sm }, style]}>
      {title || action ? (
        <View style={styles.sectionHeader}>
          {title ? (
            <AppText variant="title2" weight="semibold">
              {title}
            </AppText>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
});
