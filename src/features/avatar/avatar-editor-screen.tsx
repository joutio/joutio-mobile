import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { useRewards } from "@/features/progression/hooks/useProgression";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { haptic } from "@/lib/haptics";
import { queryKeys } from "@/lib/query-keys";
import { showToast } from "@/lib/toast";
import {
  AVATAR_BACKGROUNDS,
  parseAvatarConfig,
  type AvatarConfig,
} from "@/shared/utils/avatar";
import { eloTier } from "@/shared/utils/elo";
import { AppButton } from "@/ui/button";
import { JoChip } from "@/ui/jo/jo-chip";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { useNativeTheme } from "@/ui/theme";

/** Variantes Micah, dans le même format compact que l'éditeur web. */
const SECTIONS: { key: string; label: string; values: string[] }[] = [
  {
    key: "hair",
    label: "Cheveux",
    values: ["dannyPhantom", "dougFunny", "fonze", "full", "mrClean", "mrT", "pixie", "turban"],
  },
  { key: "eyes", label: "Yeux", values: ["eyes", "eyesShadow", "round", "smiling", "smilingShadow"] },
  {
    key: "mouth",
    label: "Bouche",
    values: ["frown", "laughing", "nervous", "pucker", "sad", "smile", "smirk", "surprised"],
  },
  { key: "glasses", label: "Lunettes", values: ["none", "round", "square"] },
  { key: "facialHair", label: "Barbe", values: ["none", "beard", "scruff"] },
];

export function AvatarEditorScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const queryClient = useQueryClient();
  const me = useMe();
  const rewards = useRewards();
  const [config, setConfig] = useState<AvatarConfig>(
    () => parseAvatarConfig(me.data?.avatarOptions) ?? { style: "base" },
  );
  const [section, setSection] = useState(SECTIONS[0].key);
  const micahUnlocked =
    Boolean(me.data?.premium) ||
    Boolean(
      rewards.data?.some(
        (reward) => reward.code === "MICAH_AVATAR" && reward.unlocked,
      ),
    );
  const micah = config.style !== "base";
  const json = JSON.stringify(config);
  const current = SECTIONS.find((item) => item.key === section) ?? SECTIONS[0];
  const rating = me.data?.progression.rating;

  const save = useMutation({
    mutationFn: () =>
      api.put<void>(
        ENDPOINTS.profileSettings.avatarOptions(me.data?.userId ?? ""),
        { avatarOptions: json },
      ),
    onSuccess: () => {
      haptic("success");
      void queryClient.invalidateQueries({ queryKey: queryKeys.me() });
      router.back();
    },
    onError: () =>
      showToast({ title: "Avatar non enregistré, réessaie.", tone: "danger" }),
  });

  const update = (key: string, value: string) =>
    setConfig((previous) => ({ ...previous, [key]: value }));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <View style={styles.preview}>
        <JoEloAvatar
          name={me.data?.pseudonym ?? "Joueur"}
          avatarOptions={json}
          size={140}
          tier={rating === undefined ? null : eloTier(rating)}
        />
      </View>

      <View style={[styles.list, { backgroundColor: colors.surface }]}>
        <JoListRow
          label="Avatar de base"
          sub="Offert à tous les joueurs"
          control="radio"
          on={!micah}
          onPress={() =>
            setConfig({ style: "base", backgroundColor: config.backgroundColor })
          }
        />
        <JoListRow
          label="Micah"
          sub={micahUnlocked ? "Débloqué" : "Se débloque avec le badge Régulier"}
          control="radio"
          on={micah}
          last
          onPress={
            micahUnlocked
              ? () =>
                  setConfig({ style: "micah", backgroundColor: config.backgroundColor })
              : undefined
          }
        />
      </View>

      <View style={styles.section}>
        <JoSectionHeader title="Fond" />
        <View style={styles.swatches}>
          {AVATAR_BACKGROUNDS.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="radio"
              accessibilityState={{ checked: config.backgroundColor === color }}
              accessibilityLabel={`Fond ${color}`}
              onPress={() => {
                haptic("selection");
                update("backgroundColor", color);
              }}
              style={[
                styles.swatch,
                {
                  backgroundColor: color,
                  borderColor:
                    config.backgroundColor === color ? colors.accent : "transparent",
                },
              ]}
            />
          ))}
        </View>
      </View>

      {micah ? (
        <View style={styles.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.rail}
            contentContainerStyle={styles.railContent}
          >
            {SECTIONS.map((item) => (
              <JoChip
                key={item.key}
                label={item.label}
                selected={item.key === section}
                onPress={() => setSection(item.key)}
              />
            ))}
          </ScrollView>
          <View style={styles.values}>
            {current.values.map((value, index) => (
              <JoChip
                key={value}
                label={value === "none" ? "Aucun" : `Modèle ${index + 1}`}
                selected={config[current.key] === value}
                onPress={() => update(current.key, value)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <AppButton
        label="Enregistrer"
        size="lg"
        fullWidth
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  preview: { alignItems: "center" },
  list: { borderRadius: 16, overflow: "hidden" },
  section: { gap: 12 },
  swatches: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3 },
  rail: { marginHorizontal: -16 },
  railContent: { gap: 8, paddingHorizontal: 16 },
  values: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
