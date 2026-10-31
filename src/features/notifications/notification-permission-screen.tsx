import { StyleSheet, View } from "react-native";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ArrowCounterClockwise, BellRinging, Lightning, Medal } from "@/ui/phosphor";
import { setItem } from "@/lib/storage";
import { JoButton } from "@/ui/jo/jo-button";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

export const NOTIFICATION_PROMPT_KEY = "joutio.notifications.prompted";

/** Pré-permission affichée après le premier duel, puis alerte système. */
export function NotificationPermissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useNativeTheme();

  const finish = (ask: boolean) => {
    void setItem(NOTIFICATION_PROMPT_KEY, "1");
    if (ask) void Notifications.requestPermissionsAsync();
    router.back();
  };

  const icon = { size: 20, color: colors.secondaryLabel };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 48,
          paddingBottom: insets.bottom + 8,
        },
      ]}
    >
      <View style={styles.head}>
        <View style={[styles.tile, { backgroundColor: colors.warm }]}>
          <BellRinging size={40} color={colors.accent} weight="fill" />
        </View>
        <AppText variant="largeTitle" style={styles.center}>
          Ne rate pas un défi
        </AppText>
        <AppText variant="body" tone="secondary" style={[styles.center, styles.lead]}>
          Un défi expire au bout d&apos;une heure. On te prévient seulement pour ce
          qui te concerne.
        </AppText>
      </View>
      <View style={[styles.list, { backgroundColor: colors.surface }]}>
        <JoListRow
          label="On te défie ou t'invite dans un salon"
          icon={<Lightning {...icon} />}
          control="none"
        />
        <JoListRow
          label="Ton adversaire veut sa revanche"
          icon={<ArrowCounterClockwise {...icon} />}
          control="none"
        />
        <JoListRow
          label="Tu changes de rang ou gagnes un badge"
          icon={<Medal {...icon} />}
          control="none"
          last
        />
      </View>
      <View style={styles.spacer} />
      <View style={styles.actions}>
        <AppText variant="footnote" tone="secondary">
          Modifiable dans Réglages › Notifications.
        </AppText>
        <JoButton label="Activer les notifications" onPress={() => finish(true)} />
        <JoButton
          label="Plus tard"
          variant="plain"
          size="M"
          onPress={() => finish(false)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24, gap: 24 },
  head: { alignItems: "center", gap: 16 },
  tile: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  center: { textAlign: "center" },
  lead: { maxWidth: 300 },
  list: { borderRadius: 16, overflow: "hidden" },
  spacer: { flex: 1 },
  actions: { alignItems: "center", gap: 8 },
});
