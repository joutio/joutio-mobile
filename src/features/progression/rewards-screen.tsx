import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useMe } from "@/features/auth/hooks/useMe";
import { AppButton } from "@/ui/button";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPill } from "@/ui/jo/jo-pill";
import { NativeAvatar } from "@/ui/avatar";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { useRewards } from "./hooks/useProgression";

interface RewardCardProps {
  name: string;
  avatarName: string;
  avatarOptions?: string;
  pill: string;
  rule: string;
  active?: boolean;
}

function RewardCard({
  name,
  avatarName,
  avatarOptions,
  pill,
  rule,
  active,
}: RewardCardProps) {
  const { colors } = useNativeTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: active ? colors.accent : "transparent",
        },
      ]}
    >
      <NativeAvatar name={avatarName} avatarOptions={avatarOptions} size={72} />
      <View style={styles.copy}>
        <View style={styles.title}>
          <AppText variant="body" weight="semibold">
            {name}
          </AppText>
          <JoPill label={pill} />
        </View>
        <AppText variant="callout" tone="secondary">
          {rule}
        </AppText>
      </View>
    </View>
  );
}

export function RewardsScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const me = useMe();
  const rewards = useRewards();
  const name = me.data?.pseudonym ?? "Joueur";
  const preview = (style: string) => JSON.stringify({ style });
  const micah = rewards.data?.find((reward) => reward.code === "MICAH_AVATAR");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <AppText variant="body" tone="secondary">
        Les styles d'avatar se débloquent par tes badges ou avec Premium.
      </AppText>
      {rewards.isPending ? (
        <JoLoading />
      ) : (
        <>
          <RewardCard
            name="Avatar de base"
            avatarName={name}
            pill="Offert"
            rule="Offert à tous les joueurs."
          />
          <RewardCard
            name="Micah"
            avatarName={name}
            avatarOptions={preview("micah")}
            pill={micah?.unlocked ? "Débloqué" : "À débloquer"}
            active={micah?.unlocked}
            rule={
              micah?.condition
                ? `Badge ${micah.condition.badgeLabel} : ${micah.condition.target} jours de série.`
                : "Se débloque avec un badge d'assiduité."
            }
          />
          <RewardCard
            name="Lorelei"
            avatarName={name}
            avatarOptions={preview("lorelei")}
            pill="Premium"
            rule="Inclus dans Premium, bientôt disponible."
          />
          <RewardCard
            name="Notionists"
            avatarName={name}
            avatarOptions={preview("notionists")}
            pill="Premium"
            rule="Inclus dans Premium, bientôt disponible."
          />
          <AppButton
            label="Modifier mon avatar"
            size="lg"
            fullWidth
            onPress={() => router.push("/me/avatar")}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 },
});
