import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import { AppText } from "../text";
import { haptic } from "@/lib/haptics";
import { useNativeTheme } from "../theme";

export type JoButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "plain"
  | "destructive"
  | "destructiveSoft";
export type JoButtonSize = "L" | "M" | "S";

interface JoButtonProps {
  label: string;
  onPress?: () => void;
  variant?: JoButtonVariant;
  size?: JoButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const SIZE: Record<JoButtonSize, { height: number; radius: number; font: number; padding: number }> = {
  L: { height: 52, radius: 12, font: 16, padding: 16 },
  M: { height: 44, radius: 12, font: 16, padding: 16 },
  S: { height: 36, radius: 9999, font: 14, padding: 12 },
};

/** Port exact de `design/assets/components/Jo Button.dc.html`. */
export function JoButton({
  label,
  onPress,
  variant = "primary",
  size = "L",
  icon,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityLabel,
}: JoButtonProps) {
  const theme = useNativeTheme();
  const { colors } = theme;
  const dims = SIZE[size];
  const isText = variant === "tertiary" || variant === "plain";

  const background =
    variant === "primary"
      ? colors.accent
      : variant === "secondary" || variant === "destructiveSoft"
        ? colors.raised
        : variant === "destructive"
          ? colors.danger
          : "transparent";

  const foreground =
    variant === "primary"
      ? colors.onAccent
      : variant === "destructive"
        ? "#000000"
        : variant === "destructiveSoft"
          ? colors.danger
          : variant === "tertiary"
            ? colors.accentInk
            : colors.label;

  const pressedBackground =
    variant === "primary"
      ? colors.accentPress
      : variant === "secondary" || variant === "destructiveSoft"
        ? colors.hover
        : background;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={() => {
        if (variant === "primary") haptic("light");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height: dims.height,
          minWidth: 44,
          width: fullWidth ? "100%" : undefined,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          paddingHorizontal: dims.padding,
          borderRadius: dims.radius,
          backgroundColor:
            pressed && !isText ? pressedBackground : background,
          opacity: disabled ? 0.4 : pressed && isText ? 0.5 : 1,
          transform: [{ scale: pressed && !isText ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={foreground} size="small" /> : null}
      {!loading && icon ? (
        <View style={styles.icon}>{icon}</View>
      ) : null}
      <AppText
        variant="headline"
        weight="semibold"
        style={{
          color: foreground,
          fontSize: dims.font,
          lineHeight: 20,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    overflow: "hidden",
  },
  icon: { alignItems: "center", justifyContent: "center" },
});
