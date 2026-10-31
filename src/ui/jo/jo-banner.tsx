import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { Robot, Sword } from "phosphor-react-native";
import { AppButton } from "@/ui/button";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoBannerProps {
  tone?: "live" | "training" | "error";
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: string;
  onAction?: () => void;
}

/** Bandeau chaud : duel qui attend le joueur ou entraînement. */
export function JoBanner({
  tone = "live",
  icon,
  title,
  message,
  action,
  onAction,
}: JoBannerProps) {
  const { colors } = useNativeTheme();
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          backgroundColor: tone === "error" ? colors.surface : colors.warm,
          borderColor: tone === "training" ? colors.accent : colors.border,
        },
      ]}
    >
      {icon ? (
        icon
      ) : tone === "training" ? (
        <Robot size={24} color={colors.accent} />
      ) : (
        <Sword size={24} color={colors.accent} weight="fill" />
      )}
      <View style={styles.copy}>
        <AppText variant="callout" weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        {message ? (
          <AppText variant="caption" tone="secondary" numberOfLines={1}>
            {message}
          </AppText>
        ) : null}
      </View>
      {action ? (
        <AppButton
          label={action}
          size="sm"
          variant={tone === "error" ? "secondary" : "primary"}
          onPress={onAction}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  copy: { flex: 1, minWidth: 0 },
});
