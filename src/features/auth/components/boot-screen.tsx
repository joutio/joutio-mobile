import { ActivityIndicator, StyleSheet, View } from "react-native";
import { JoutioMark } from "@/ui/logo";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

/** Écran d'attente pendant la restauration de session et le chargement des polices. */
export function BootScreen() {
  const theme = useNativeTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <JoutioMark size={64} />
      <AppText variant="headline" weight="semibold">
        joutio
      </AppText>
      <AppText variant="footnote" tone="secondary">
        Le quiz qui se joue à deux.
      </AppText>
      <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  spinner: { marginTop: 10 },
});
