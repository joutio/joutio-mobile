import { Platform, Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { AppText } from "./text";
import { NativeIcon } from "./icons";
import { useNativeTheme } from "./theme";

interface AppListRowProps {
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  last?: boolean;
  destructive?: boolean;
}

/** Ligne native : séparateur iOS, chevron, ripple Android. */
export function AppListRow({
  title,
  subtitle,
  trailing,
  onPress,
  last = false,
  destructive = false,
}: AppListRowProps) {
  const theme = useNativeTheme();
  const { colors, isIOS, spacing } = theme;

  const content = (
    <View
      style={[
        styles.row,
        {
          minHeight: isIOS ? 44 : 56,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.separator,
        },
      ]}
    >
      <View style={styles.copy}>
        <AppText
          variant="body"
          numberOfLines={1}
          style={{ color: destructive ? colors.danger : colors.label }}
        >
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="footnote" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
      {onPress && !trailing ? (
        <NativeIcon ios="chevron.right" android="chevron_right" size={16} color={colors.tertiaryLabel} />
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, gap: 2 },
});
