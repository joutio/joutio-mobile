import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CaretRight, CheckCircle, Circle, RadioButton } from "@/ui/phosphor";
import { haptic } from "@/lib/haptics";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { JoSwitch } from "./jo-switch";

interface JoListRowProps {
  label: string;
  sub?: string;
  icon?: ReactNode;
  value?: string | number;
  control?: "chevron" | "radio" | "check" | "toggle" | "none";
  on?: boolean;
  strong?: boolean;
  destructive?: boolean;
  last?: boolean;
  disabled?: boolean;
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
  disabled = false,
  onPress,
}: JoListRowProps) {
  const { colors } = useNativeTheme();
  const selectable =
    control === "radio" || control === "check" || control === "toggle";
  const SelectedIcon = control === "radio" ? RadioButton : CheckCircle;
  return (
    <Pressable
      accessibilityRole={
        control === "radio" ? "radio" : control === "toggle" ? "switch" : "button"
      }
      accessibilityState={selectable ? { checked: on, disabled } : { disabled }}
      disabled={disabled || !onPress}
      onPress={() => {
        if (selectable) haptic("selection");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.row,
        {
          minHeight: sub ? 64 : 50,
          backgroundColor: pressed ? colors.hover : "transparent",
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <View style={styles.copy}>
        <AppText
          variant="body"
          weight={strong ? "semibold" : "regular"}
          tone={destructive ? "danger" : "default"}
        >
          {label}
        </AppText>
        {sub ? (
          <AppText variant="footnote" tone="secondary">
            {sub}
          </AppText>
        ) : null}
      </View>
      {value !== undefined || (control === "chevron" && onPress) ? (
        <View style={styles.trailing}>
          {value !== undefined ? (
            <AppText variant="body" tone="secondary">
              {value}
            </AppText>
          ) : null}
          {control === "chevron" && onPress ? (
            <CaretRight size={14} color={colors.secondaryLabel} />
          ) : null}
        </View>
      ) : null}
      {control === "radio" || control === "check" ? (
        on ? (
          <SelectedIcon size={24} color={colors.accent} weight="fill" />
        ) : (
          <Circle size={24} color={colors.secondaryLabel} />
        )
      ) : null}
      {control === "toggle" ? <JoSwitch on={on} /> : null}
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
  icon: { width: 24, alignItems: "center" },
  trailing: { flexDirection: "row", alignItems: "center", gap: 4 },
});
