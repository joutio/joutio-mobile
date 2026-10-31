import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { JoButton } from "./jo-button";

interface JoEmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
  secondary?: string;
  onSecondary?: () => void;
}

/** État vide : pictogramme, titre, message et action facultative. */
export function JoEmptyState({
  icon,
  title,
  message,
  action,
  onAction,
  secondary,
  onSecondary,
}: JoEmptyStateProps) {
  const { colors } = useNativeTheme();
  return (
    <View style={styles.root}>
      <View style={[styles.icon, { backgroundColor: colors.raised }]}>{icon}</View>
      <AppText variant="title1" weight="bold" style={styles.text}>
        {title}
      </AppText>
      <AppText variant="body" tone="secondary" style={[styles.text, styles.message]}>
        {message}
      </AppText>
      {action || secondary ? (
        <View style={styles.actions}>
          {action ? <JoButton label={action} onPress={onAction} /> : null}
          {secondary ? (
            <JoButton
              label={secondary}
              variant="plain"
              size="M"
              onPress={onSecondary}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "center", gap: 12, paddingVertical: 32, paddingHorizontal: 16 },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { textAlign: "center" },
  message: { maxWidth: 300 },
  actions: { alignSelf: "stretch", gap: 4, marginTop: 8 },
});
