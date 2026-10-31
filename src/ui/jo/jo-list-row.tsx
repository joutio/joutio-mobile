import type { ReactNode } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { CaretRight, CheckCircle } from "phosphor-react-native";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoListRowProps {
  label: string;
  sub?: string;
  icon?: ReactNode;
  value?: string | number;
  control?: "chevron" | "radio" | "toggle" | "none";
  on?: boolean;
  strong?: boolean;
  destructive?: boolean;
  last?: boolean;
  onPress?: () => void;
}

/** Ligne de liste 50/64 px : icône, libellé et contrôle. */
export function JoListRow({
  label,
  sub,
  icon,
  value,
  control = "chevron",
  on = false,
  strong = false,
  destructive = false,
  last = false,
  onPress,
}: JoListRowProps) {
  const { colors } = useNativeTheme();
  return (
    <Pressable
      accessibilityRole={
        control === "radio" ? "radio" : control === "toggle" ? "switch" : "button"
      }
      accessibilityState={
        control === "radio" || control === "toggle" ? { checked: on } : undefined
      }
      disabled={!onPress}
      onPress={() => {
        if (control === "radio" || control === "toggle") haptic("selection");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: sub ? 64 : 50,
          backgroundColor: pressed ? colors.hover : "transparent",
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      {icon}
      <View style={styles.copy}>
        <AppText
          variant="body"
          weight={strong ? "semibold" : "regular"}
          tone={destructive ? "danger" : "default"}
        >
          {label}
        </AppText>
        {sub ? (
          <AppText variant="caption" tone="secondary">
            {sub}
          </AppText>
        ) : null}
      </View>
      {value !== undefined ? (
        <AppText variant="body" tone="secondary">
          {value}
        </AppText>
      ) : null}
      {control === "chevron" && onPress ? (
        <CaretRight size={14} color={colors.secondaryLabel} />
      ) : null}
      {control === "radio" ? (
        on ? (
          <CheckCircle size={24} color={colors.accent} weight="fill" />
        ) : (
          <View style={[styles.radio, { borderColor: colors.secondaryLabel }]} />
        )
      ) : null}
      {control === "toggle" ? (
        <Switch
          value={on}
          onValueChange={() => {
            haptic("selection");
            onPress?.();
          }}
          trackColor={{ true: colors.accent, false: colors.hover }}
          ios_backgroundColor={colors.hover}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  copy: { flex: 1, minWidth: 0 },
  radio: { width: 20, height: 20, margin: 2, borderRadius: 10, borderWidth: 2 },
});
