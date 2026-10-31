import { useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Copy, Export, UserPlus } from "@/ui/phosphor";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMe } from "@/features/auth/hooks/useMe";
import { useSessionStore } from "@/features/auth/session-store";
import { leaveDuelFlow } from "@/lib/navigation";
import { showToast } from "@/lib/toast";
import { CountdownText } from "@/shared/components/countdown-text";
import { useNow } from "@/shared/hooks/useNow";
import { confirmAction } from "@/shared/utils/confirm";
import { eloTier } from "@/shared/utils/elo";
import { topicName } from "@/shared/utils/topic-name";
import type { RoomStatus } from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoPill } from "@/ui/jo/jo-pill";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { RoomStepper } from "./components/room-stepper";
import {
  useCancelRoom,
  useLeaveRoom,
  useRoom,
  useRoomJoin,
  useRoomWizzNotifications,
  useWizzRoom,
} from "./hooks/useRoom";

const STATUS_LABEL: Record<RoomStatus, string> = {
  WAITING_PLAYERS: "En attente des joueurs",
  FETCHING_PLAYERS: "Chargement des profils",
  FETCHING_PLAYED_QUESTIONS: "Historique des questions",
  FETCHING_QUESTIONS: "Sélection des questions",
  CREATING_GAME: "Création de la partie",
  GAME_CREATED: "Lancement du duel",
  COMPLETED: "Partie terminée",
  CANCELLED: "Salon fermé",
  EXPIRED: "Salon expiré",
  FAILED: "Préparation échouée",
};

export function RoomScreen() {
  const { roomId = "" } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useNativeTheme();
  const me = useMe();
  const roomQuery = useRoom(roomId);
  const cancel = useCancelRoom(roomId);
  const leave = useLeaveRoom(roomId);
  const wizz = useWizzRoom(roomId);
  const now = useNow(1000);
  const setPendingRoomId = useSessionStore((state) => state.setPendingRoomId);

  useRoomJoin(roomId);
  useRoomWizzNotifications(roomId, me.data?.userId ?? null);

  useEffect(() => {
    setPendingRoomId(null);
  }, [setPendingRoomId]);

  useEffect(() => {
    if (roomQuery.data?.gameId) {
      router.replace(`/(app)/duel/${roomQuery.data.gameId}`);
    }
  }, [roomQuery.data?.gameId, router]);

  if (roomQuery.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
        <AppText variant="callout" tone="secondary">
          Préparation du salon…
        </AppText>
      </View>
    );
  }

  if (!roomQuery.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText variant="headline">Salon introuvable</AppText>
        <AppButton
          label="Retour"
          variant="secondary"
          onPress={() => leaveDuelFlow(router)}
        />
      </View>
    );
  }

  const room = roomQuery.data;
  const topic = room.topic;
  const language = me.data?.language ?? "fr";
  const isInitiator = room.canCancel;
  const myPresent = isInitiator ? room.initiatorPresent : room.participantPresent;
  const opponentPresent = isInitiator
    ? room.participantPresent
    : room.initiatorPresent;
  const opponentName = room.vsBot ? "Bot" : (room.opponent?.pseudonym ?? null);
  const waiting = room.status === "WAITING_PLAYERS";
  const cooldown = Math.max(0, Math.ceil((wizz.cooldownUntil - now) / 1000));
  const canWizz =
    !room.vsBot && room.opponent !== null && waiting && myPresent && !opponentPresent;
  const terminal =
    room.status === "CANCELLED" ||
    room.status === "EXPIRED" ||
    room.status === "FAILED";
  const link = `https://app.joutio.com/join/${room.roomId}`;
  const showLink = waiting && !room.vsBot && room.opponent === null;
  const backToTopic = () => leaveDuelFlow(router);
  const rating = me.data?.progression.rating;

  const shareRoom = async () => {
    try {
      await Share.share({
        message: `Rejoins mon duel Joutio : ${link}\nDans l'app : joutio://join/${room.roomId}`,
      });
    } catch {
      // Partage annulé ou indisponible.
    }
  };

  const closeRoom = () => {
    confirmAction({
      title: room.vsBot ? "Annuler le duel ?" : "Fermer le salon ?",
      message: "Le salon sera fermé pour tous les joueurs.",
      confirmLabel: "Fermer",
      destructive: true,
      onConfirm: () => cancel.mutate(undefined, { onSuccess: backToTopic }),
    });
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.topic}>
        <JoPill label={topicName(topic.names, language)} />
      </View>

      <View style={styles.versus}>
        <View style={styles.player}>
          <JoEloAvatar
            name={me.data?.pseudonym ?? "Toi"}
            avatarOptions={me.data?.avatarOptions}
            size={84}
            tier={rating === undefined ? null : eloTier(rating)}
          />
          <AppText variant="body" weight="semibold">
            Toi
          </AppText>
          <AppText
            variant="caption"
            weight="semibold"
            style={{ color: myPresent ? colors.success : colors.secondaryLabel }}
          >
            {myPresent ? "Présent" : "Connexion…"}
          </AppText>
        </View>
        <AppText variant="caption" weight="semibold" tone="secondary">
          vs
        </AppText>
        <View style={styles.player}>
          {opponentName ? (
            <JoEloAvatar
              name={opponentName}
              avatarOptions={room.opponent?.avatarOptions}
              size={84}
            />
          ) : (
            <View style={[styles.empty, { borderColor: colors.border }]}>
              <UserPlus size={30} color={colors.secondaryLabel} />
            </View>
          )}
          <AppText
            variant="body"
            weight="semibold"
            numberOfLines={1}
            tone={opponentName ? "default" : "secondary"}
          >
            {opponentName ?? "En attente"}
          </AppText>
          <AppText
            variant="caption"
            weight={opponentPresent ? "semibold" : "regular"}
            style={{
              textAlign: "center",
              color:
                opponentPresent || room.vsBot
                  ? colors.success
                  : colors.secondaryLabel,
            }}
          >
            {opponentPresent || room.vsBot
              ? "Présent"
              : opponentName
                ? "En attente"
                : "Le duel démarre à deux"}
          </AppText>
        </View>
      </View>

      {terminal ? (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <AppText variant="headline">{STATUS_LABEL[room.status]}</AppText>
          <AppText variant="callout" tone="secondary">
            Ce salon n'est plus disponible.
          </AppText>
          <AppButton
            label="Retour au sujet"
            variant="secondary"
            fullWidth
            onPress={backToTopic}
          />
        </View>
      ) : (
        <>
          {showLink ? (
            <>
              <View style={[styles.card, { backgroundColor: colors.surface }]}>
                <AppText
                  variant="footnote"
                  tone="secondary"
                  numberOfLines={1}
                  style={styles.mono}
                >
                  {link.replace("https://", "")}
                </AppText>
                <AppButton
                  label="Copier le lien"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={<Copy size={16} color={colors.label} />}
                  onPress={() => {
                    void Clipboard.setStringAsync(link).then(() =>
                      showToast({ title: "Lien copié" }),
                    );
                  }}
                />
              </View>
              <AppButton
                label="Inviter un adversaire"
                size="lg"
                fullWidth
                icon={<Export size={20} color={colors.onAccent} />}
                onPress={() => void shareRoom()}
              />
            </>
          ) : null}

          {!waiting || room.vsBot ? (
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <AppText variant="callout" weight="semibold">
                {STATUS_LABEL[room.status]}
              </AppText>
              <RoomStepper status={room.status} />
            </View>
          ) : null}

          {canWizz ? (
            <AppButton
              label={
                cooldown > 0
                  ? `Relancer dans ${cooldown} s`
                  : `Relancer ${opponentName}`
              }
              size="lg"
              fullWidth
              disabled={wizz.pending || cooldown > 0}
              onPress={wizz.send}
            />
          ) : null}

          {waiting && myPresent && !room.vsBot && !isInitiator ? (
            <AppButton
              label="Quitter le salon"
              variant="plain"
              fullWidth
              loading={leave.isPending}
              onPress={() =>
                leave.mutate(undefined, { onSuccess: backToTopic })
              }
            />
          ) : null}

          <View style={styles.spacer} />
          <View style={styles.footer}>
            <View style={styles.expiry}>
              <AppText variant="footnote" tone="secondary">
                Expire dans
              </AppText>
              <CountdownText deadline={room.expiresAt} />
            </View>
            {isInitiator ? (
              <AppButton
                label={room.vsBot ? "Annuler" : "Fermer le salon"}
                variant="destructiveSoft"
                size="sm"
                loading={cancel.isPending}
                onPress={closeRoom}
              />
            ) : null}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  content: { flexGrow: 1, gap: 24, paddingTop: 8, paddingHorizontal: 16 },
  topic: { alignItems: "center" },
  versus: { flexDirection: "row", alignItems: "center", gap: 12 },
  player: { flex: 1, minWidth: 0, alignItems: "center", gap: 8 },
  empty: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  card: { gap: 12, padding: 16, borderRadius: 16 },
  mono: { fontFamily: "GeistMono_400Regular" },
  spacer: { flex: 1 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  expiry: { flexDirection: "row", alignItems: "center", gap: 4 },
});
