import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HOME_HREF } from "@/lib/navigation";
import { topicName } from "@/shared/utils/topic-name";
import { useMe } from "@/features/auth/hooks/useMe";
import { JoButton } from "@/ui/jo/jo-button";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPill } from "@/ui/jo/jo-pill";
import { Lightning } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { useRoom } from "./hooks/useRoom";

/** Invitation ouverte depuis un lien, avant d'entrer dans le salon. */
export function JoinRoomScreen() {
  const { roomId = "" } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useNativeTheme();
  const me = useMe();
  const room = useRoom(roomId);
  const data = room.data;
  const enter = () => router.replace(`/(app)/room/${roomId}`);

  // Sans hôte à présenter (salon déjà engagé), l'invitation n'a rien à ajouter.
  useEffect(() => {
    if (data && data.status !== "WAITING_PLAYERS") {
      router.replace(`/(app)/room/${roomId}`);
    }
  }, [data, roomId, router]);

  if (room.isPending) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.body}>
          <JoLoading />
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={styles.body}>
          <AppText variant="title2" style={styles.center}>
            Ce salon n&apos;existe plus
          </AppText>
          <JoButton
            label="Retour à l'accueil"
            variant="secondary"
            onPress={() => router.replace(HOME_HREF)}
          />
        </View>
      </View>
    );
  }

  const host = data.opponent?.pseudonym ?? "Un joueur";

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 16,
        },
      ]}
    >
      <View style={styles.body}>
        <JoEloAvatar
          name={host}
          avatarOptions={data.opponent?.avatarOptions}
          size={112}
          animated
        />
        <AppText variant="largeTitle" style={[styles.center, styles.title]}>
          {host} t&apos;invite à un duel
        </AppText>
        <JoPill
          kind="tag"
          label={topicName(data.topic.names, me.data?.language ?? "fr")}
        />
        <AppText variant="callout" weight="regular" tone="secondary" style={[styles.center, styles.lead]}>
          7 manches de 10 secondes. Le duel démarre dès que tu entres dans le
          salon.
        </AppText>
      </View>
      <JoButton
        label="Rejoindre le duel"
        icon={<Lightning size={20} color={colors.onAccent} weight="fill" />}
        onPress={enter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  center: { textAlign: "center" },
  title: { maxWidth: 300 },
  lead: { maxWidth: 280 },
});
