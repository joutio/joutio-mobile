import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { CaretLeft } from "@/ui/phosphor";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OfflineBanner } from "@/shared/components/offline-banner";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoNavBarProps {
  variant?: "large" | "inline";
  title: string;
  subtitle?: string;
  /** Libellé du retour (variante `inline`). */
  backLabel?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

/** Barre de titre Joutio, posée sous la status bar système. */
export function JoNavBar({
  variant = "large",
  title,
  subtitle,
  backLabel = "Retour",
  onBack,
  actions,
}: JoNavBarProps) {
  const { colors } = useNativeTheme();
  const { top } = useSafeAreaInsets();

  if (variant === "large") {
    return (
      <View
        style={[
          styles.large,
          { paddingTop: top + 4, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.largeRow}>
          <AppText
            variant="largeTitle"
            weight="bold"
            accessibilityRole="header"
            numberOfLines={1}
            style={styles.largeTitle}
          >
            {title}
          </AppText>
          <View style={styles.actions}>{actions}</View>
        </View>
        {subtitle ? (
          <AppText variant="callout" tone="secondary" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
        <OfflineBanner />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.inline,
        { paddingTop: top, backgroundColor: colors.background },
      ]}
    >
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
            style={({ pressed }) => [
              styles.back,
              { opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <CaretLeft size={24} color={colors.accentInk} />
            <AppText
              variant="body"
              numberOfLines={1}
              style={{ color: colors.accentInk }}
            >
              {backLabel}
            </AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText
        variant="body"
        weight="semibold"
        accessibilityRole="header"
        numberOfLines={1}
        style={styles.inlineTitle}
      >
        {title}
      </AppText>
      <View style={[styles.side, styles.sideEnd]}>{actions}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  large: { paddingLeft: 16, paddingRight: 8, paddingBottom: 8 },
  largeRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  largeTitle: { flexShrink: 1 },
  actions: { flexDirection: "row" },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  side: { flex: 1, minHeight: 48, flexDirection: "row", alignItems: "center" },
  sideEnd: { justifyContent: "flex-end" },
  back: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingRight: 8,
  },
  inlineTitle: { maxWidth: 200, textAlign: "center" },
});
