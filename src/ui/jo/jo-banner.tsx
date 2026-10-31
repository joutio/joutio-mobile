import { StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { Info, Robot, Sword, WifiSlash } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { JoButton } from "./jo-button";

interface JoBannerProps {
  tone?: "live" | "training" | "error" | "info";
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
          backgroundColor:
            tone === "error" || tone === "info" ? colors.surface : colors.warm,
          borderColor: tone === "training" ? colors.accent : colors.border,
        },
      ]}
    >
      {icon ? (
        icon
      ) : tone === "training" ? (
        <Robot size={24} color={colors.accent} />
      ) : tone === "error" ? (
        <WifiSlash size={24} color={colors.danger} />
      ) : tone === "info" ? (
        <Info size={24} color={colors.secondaryLabel} />
      ) : (
        <Sword size={24} color={colors.accent} weight="fill" />
      )}
      <View style={styles.copy}>
        <AppText
          variant="callout"
          weight="semibold"
          numberOfLines={1}
          style={tone === "training" ? { color: colors.accentInk } : undefined}
        >
          {title}
        </AppText>
        {message ? (
          <AppText variant="footnote" tone="secondary" numberOfLines={1}>
            {message}
          </AppText>
        ) : null}
      </View>
      {action ? (
        <JoButton
          label={action}
          size="S"
          fullWidth={false}
          variant={tone === "live" ? "primary" : "secondary"}
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
