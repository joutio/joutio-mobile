import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { ReactNode } from "react";
import { AppText } from "./text";
import { haptic } from "@/lib/haptics";
import { useNativeTheme } from "./theme";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "plain"
  | "destructiveSoft"
  | "destructive";
type ButtonSize = "sm" | "md" | "lg";

interface AppButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** Bouton Joutio : une seule action primary par écran. */
export function AppButton({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityLabel,
}: AppButtonProps) {
  const theme = useNativeTheme();
  const { colors, radius } = theme;
  const height = size === "lg" ? 52 : size === "sm" ? 36 : 44;

  const background =
    variant === "primary"
      ? colors.accent
      : variant === "destructive"
        ? colors.danger
        : variant === "destructiveSoft"
          ? colors.dangerSoft
          : variant === "secondary"
            ? colors.fill
            : "transparent";

  const labelColor =
    variant === "primary" || variant === "destructive"
      ? variant === "destructive"
        ? "#FFFFFF"
        : colors.onAccent
      : variant === "destructiveSoft"
        ? colors.danger
        : variant === "tertiary"
          ? colors.accentInk
          : variant === "secondary"
            ? colors.label
            : colors.secondaryLabel;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        if (variant === "primary") haptic("light");
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        {
          height,
          borderRadius: radius.md,
          backgroundColor: background,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: colors.border,
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          paddingHorizontal: variant === "plain" || variant === "tertiary" ? 10 : size === "sm" ? 14 : 20,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <View style={styles.content}>
          {icon ? <View style={styles.icon}>{icon}</View> : null}
          <AppText
            variant={size === "sm" ? "callout" : "headline"}
            weight="semibold"
            style={{ color: labelColor }}
          >
            {label}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  content: { flexDirection: "row", alignItems: "center", gap: 8 },
  icon: { alignItems: "center", justifyContent: "center" },
});
