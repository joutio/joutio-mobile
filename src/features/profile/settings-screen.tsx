import { Linking, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CrownSimple,
  FileText,
  Lightning,
  ShieldCheck,
  SignOut,
  Trash,
  UserCircle,
  UserPlus,
  Vibrate,
} from "@/ui/phosphor";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLogout } from "@/features/auth/hooks/useLogout";
import { useMe } from "@/features/auth/hooks/useMe";
import { useHapticsStore } from "@/lib/haptics";
import { queryKeys } from "@/lib/query-keys";
import { meService } from "@/lib/services/me";
import { confirmAction } from "@/shared/utils/confirm";
import { eloTier } from "@/shared/utils/elo";
import { AppButton } from "@/ui/button";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { AppText } from "@/ui/text";
import {
  useAppearanceStore,
  useNativeTheme,
  type Appearance,
} from "@/ui/theme";

const APPEARANCES: { value: Appearance; label: string }[] = [
  { value: "dark", label: "Sombre" },
  { value: "light", label: "Clair" },
  { value: "system", label: "Système" },
];

export function SettingsScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const queryClient = useQueryClient();
  const me = useMe();
  const signOut = useLogout();
  const appearance = useAppearanceStore((state) => state.appearance);
  const setAppearance = useAppearanceStore((state) => state.setAppearance);
  const vibrations = useHapticsStore((state) => state.enabled);
  const setVibrations = useHapticsStore((state) => state.setEnabled);
  const icon = { size: 20, color: colors.secondaryLabel };

  const preferences = useQuery({
    queryKey: queryKeys.notificationPreferences(),
    queryFn: meService.notificationPreferences,
    staleTime: 60_000,
  });
  const updatePreference = useMutation({
    mutationFn: (input: { category: string; enabled: boolean }) =>
      meService.updateNotificationPreference(input.category, input.enabled),
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notificationPreferences(),
      }),
  });
  const enabled = (category: string) =>
    preferences.data?.find((item) => item.category === category)?.enabled ?? true;
  const toggle = (category: string) =>
    updatePreference.mutate({ category, enabled: !enabled(category) });

  const rating = me.data?.progression.rating;
  const name = me.data?.pseudonym ?? "Joueur";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.identity, { backgroundColor: colors.surface }]}>
        <JoEloAvatar
          name={name}
          avatarOptions={me.data?.avatarOptions}
          size={56}
          tier={rating === undefined ? null : eloTier(rating)}
        />
        <View style={styles.copy}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="footnote" tone="secondary" numberOfLines={1}>
            {me.data?.email}
          </AppText>
        </View>
        <AppButton
          label="Avatar"
          variant="secondary"
          size="sm"
          onPress={() => router.push("/(app)/avatar")}
        />
      </View>

      <View style={styles.section}>
        <JoSectionHeader title="Apparence" />
        <JoSegmented
          options={APPEARANCES}
          value={appearance}
          onChange={setAppearance}
        />
      </View>

      <View style={styles.section}>
        <JoSectionHeader title="Duel" />
        <View style={[styles.list, { backgroundColor: colors.surface }]}>
          <JoListRow
            label="Vibrations"
            icon={<Vibrate {...icon} />}
            control="toggle"
            on={vibrations}
            last
            onPress={() => setVibrations(!vibrations)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <JoSectionHeader title="Notifications" />
        <View style={[styles.list, { backgroundColor: colors.surface }]}>
          <JoListRow
            label="Défis et salons"
            icon={<Lightning {...icon} />}
            control="toggle"
            on={enabled("ROOM")}
            onPress={() => toggle("ROOM")}
          />
          <JoListRow
            label="Nouveaux abonnés"
            icon={<UserPlus {...icon} />}
            control="toggle"
            on={enabled("FOLLOW")}
            last
            onPress={() => toggle("FOLLOW")}
          />
        </View>
      </View>

      <View style={styles.section}>
        <JoSectionHeader title="Compte" />
        <View style={[styles.list, { backgroundColor: colors.surface }]}>
          <JoListRow
            label="Mon profil"
            icon={<UserCircle {...icon} />}
            onPress={() => router.push("/me/edit")}
          />
          <JoListRow
            label="Premium"
            icon={<CrownSimple {...icon} />}
            value="Bientôt"
            onPress={() => router.push("/premium")}
          />
          <JoListRow
            label="Confidentialité et données"
            icon={<ShieldCheck {...icon} />}
            onPress={() => void Linking.openURL("https://joutio.com/privacy/")}
          />
          <JoListRow
            label="Conditions d'utilisation"
            icon={<FileText {...icon} />}
            onPress={() => void Linking.openURL("https://joutio.com/terms/")}
          />
          <JoListRow
            label="Se déconnecter"
            icon={<SignOut {...icon} />}
            control="none"
            onPress={() =>
              confirmAction({
                title: "Se déconnecter ?",
                confirmLabel: "Se déconnecter",
                onConfirm: () => void signOut(),
              })
            }
          />
          <JoListRow
            label="Supprimer mon compte"
            icon={<Trash size={20} color={colors.danger} />}
            control="none"
            destructive
            last
            onPress={() => router.push("/delete-account")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
  },
  copy: { flex: 1, minWidth: 0 },
  section: { gap: 12 },
  list: { borderRadius: 16, overflow: "hidden" },
});
