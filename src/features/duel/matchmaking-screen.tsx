import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle,
  GlobeHemisphereWest,
  Robot,
  Users,
  X,
} from "phosphor-react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMe } from "@/features/auth/hooks/useMe";
import { usePlayer } from "@/features/social/hooks/usePeople";
import { useTopicOverview } from "@/features/topic/hooks/useTopicDetail";
import { haptic } from "@/lib/haptics";
import { leaveDuelFlow } from "@/lib/navigation";
import { useNow } from "@/shared/hooks/useNow";
import { categoryColor } from "@/shared/utils/categories";
import { eloTier } from "@/shared/utils/elo";
import { topicName } from "@/shared/utils/topic-name";
import type { TopicCardView } from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { AppText } from "@/ui/text";
import { EASE, riseIn } from "@/ui/motion";
import { tierLabel } from "@/ui/tokens";
import { DarkTheme } from "@/ui/theme";
import {
  useCancelMatchmaking,
  useMatchmakingTicket,
  useStartMatchmaking,
} from "./hooks/useMatchmaking";
import { useCreateRoom, useStartBotRoom } from "./hooks/useRoom";
import { MatchmakingMap } from "./components/matchmaking-map";

const SEARCH_MS = 10_000;
const FOUND_MS = 1_200;

function TopicTile({ topic, size }: { topic?: TopicCardView; size: number }) {
  const image = topic?.imageUrl ?? topic?.bannerUrl;
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          backgroundColor: topic?.color ?? categoryColor(topic?.category ?? ""),
        },
      ]}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <AppText style={{ fontSize: size / 2 }}>{topic?.emoji?.trim() || "?"}</AppText>
      )}
    </View>
  );
}

function SearchCountdown({ createdAt }: { createdAt: string }) {
  const now = useNow(500);
  const remaining = Math.max(
    0,
    Math.ceil((Date.parse(createdAt) + SEARCH_MS - now) / 1000),
  );
  return (
    <AppText variant="numeric" style={styles.counterText}>
      {remaining} s
    </AppText>
  );
}

/** Carte courte avant le salon : le temps de voir qui arrive. */
function OpponentFound({ opponentId }: { opponentId: string }) {
  const player = usePlayer(opponentId);
  const data = player.data;
  const { rating, provisional } = data?.progression ?? {
    rating: 0,
    provisional: true,
  };
  const rank = provisional
    ? `Provisoire · ${rating}`
    : `${tierLabel(eloTier(rating))} · ${rating}`;
  return (
    <Animated.View
      style={[
        styles.foundWrap,
        {
          animationName: riseIn,
          animationDuration: 400,
          animationTimingFunction: EASE,
          animationFillMode: "both",
        },
      ]}
    >
      <View style={styles.found}>
        <JoEloAvatar
          name={data?.pseudonym ?? "Adversaire"}
          avatarOptions={data?.avatarOptions}
          size={56}
          tier={data && !provisional ? eloTier(rating) : null}
        />
        <View style={styles.flex}>
          <AppText variant="caption" weight="semibold" style={styles.success}>
            Adversaire trouvé
          </AppText>
          <AppText variant="headline" weight="semibold" numberOfLines={1}>
            {data?.pseudonym ?? "…"}
          </AppText>
          <AppText variant="caption" style={styles.muted} numberOfLines={1}>
            {data ? `${rank}${data.country ? ` · ${data.country}` : ""}` : " "}
          </AppText>
        </View>
        <CheckCircle size={30} color="#4FB286" weight="fill" />
      </View>
      <AppText variant="caption" style={styles.muted}>
        Le duel commence
      </AppText>
    </Animated.View>
  );
}

function Hint({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.hint}>
      {icon}
      <AppText variant="caption" style={styles.muted}>
        {label}
      </AppText>
    </View>
  );
}

function Search() {
  const { ticketId = "" } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useMe();
  const ticketQuery = useMatchmakingTicket(ticketId);
  const cancel = useCancelMatchmaking(ticketId);
  const retry = useStartMatchmaking({ replace: true });
  const startBot = useStartBotRoom({ replace: true });
  const createRoom = useCreateRoom({ replace: true });
  const ticket = ticketQuery.data;
  const topicQuery = useTopicOverview(ticket?.topicId ?? "");
  const topic = topicQuery.data?.topic;
  const label = topic ? topicName(topic.names, me.data?.language ?? "fr") : "";

  useEffect(() => {
    if (ticket?.status !== "COMPLETED" || !ticket.roomId) return;
    const roomId = ticket.roomId;
    haptic("medium");
    const timer = setTimeout(
      () => router.replace(`/(app)/room/${roomId}`),
      ticket.opponentId && !ticket.vsBot ? FOUND_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [router, ticket?.opponentId, ticket?.roomId, ticket?.status, ticket?.vsBot]);

  const backToTopic = () => leaveDuelFlow(router);
  const searching = ticket?.status === "SEARCHING";
  const close = () =>
    searching ? cancel.mutate(undefined, { onSuccess: backToTopic }) : backToTopic();

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <MatchmakingMap />
      <View style={styles.top}>
        <View style={styles.close}>
          <JoIconButton
            label="Fermer"
            icon={<X size={20} color="#FFFFFF" />}
            onPress={close}
          />
        </View>
        <View style={styles.tag}>
          <AppText variant="caption" weight="semibold" style={styles.muted}>
            Partie classée
          </AppText>
        </View>
      </View>

      <View style={styles.spacer} />

      {ticketQuery.isPending ? (
        <ActivityIndicator color="#E8B04A" style={styles.spinner} />
      ) : !ticket ? (
        <View style={styles.panel}>
          <AppText variant="headline">Recherche introuvable</AppText>
          <AppButton label="Retour" variant="secondary" fullWidth onPress={backToTopic} />
        </View>
      ) : searching ? (
        <View style={styles.search}>
          <TopicTile topic={topic} size={60} />
          <AppText variant="title2" weight="semibold" style={styles.centered}>
            {label}
          </AppText>
          <View style={styles.pill}>
            <AppText variant="callout" weight="semibold" style={styles.ink}>
              Recherche d'un adversaire…
            </AppText>
            <View style={styles.counter}>
              <SearchCountdown createdAt={ticket.createdAt} />
            </View>
          </View>
          <View style={styles.hints}>
            <Hint icon={<Users size={14} color="#9B9B9B" />} label="Elo proche" />
            <Hint
              icon={<GlobeHemisphereWest size={14} color="#9B9B9B" />}
              label="Même pays d'abord"
            />
            <Hint
              icon={<Robot size={14} color="#9B9B9B" />}
              label="Sans adversaire : entraînement possible"
            />
          </View>
          <AppButton
            label="Annuler"
            variant="secondary"
            size="lg"
            fullWidth
            loading={cancel.isPending}
            onPress={close}
          />
        </View>
      ) : ticket.status === "COMPLETED" ? (
        ticket.opponentId && !ticket.vsBot ? (
          <OpponentFound opponentId={ticket.opponentId} />
        ) : (
          <ActivityIndicator color="#E8B04A" style={styles.spinner} />
        )
      ) : (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <TopicTile topic={topic} size={44} />
            <View style={styles.flex}>
              <AppText variant="headline" weight="semibold">
                {ticket.status === "EXPIRED"
                  ? "Aucun adversaire trouvé"
                  : ticket.status === "FAILED"
                    ? "Recherche impossible"
                    : "Recherche annulée"}
              </AppText>
              <AppText variant="caption" style={styles.muted} numberOfLines={1}>
                {label}
              </AppText>
            </View>
          </View>
          <AppText variant="body" style={styles.muted}>
            Relance une recherche, ou entraîne-toi contre un robot (sans
            expérience gagnée) le temps qu'un adversaire se présente.
          </AppText>
          <AppButton
            label="S'entraîner contre un robot"
            size="lg"
            fullWidth
            icon={<Robot size={20} color="#000000" />}
            loading={startBot.isPending}
            onPress={() =>
              startBot.mutate({ topicId: ticket.topicId, difficulty: "NORMAL" })
            }
          />
          <View style={styles.row}>
            <AppButton
              label="Relancer"
              variant="secondary"
              fullWidth
              style={styles.flex}
              loading={retry.isPending}
              onPress={() => retry.mutate(ticket.topicId)}
            />
            <AppButton
              label="Défier un ami"
              variant="secondary"
              fullWidth
              style={styles.flex}
              loading={createRoom.isPending}
              onPress={() => createRoom.mutate(ticket.topicId)}
            />
          </View>
        </View>
      )}
    </View>
  );
}

export function MatchmakingScreen() {
  return (
    <DarkTheme value>
      <StatusBar style="light" />
      <Search />
    </DarkTheme>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, backgroundColor: "#000000" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  close: { borderRadius: 22, backgroundColor: "rgba(31,31,31,0.8)" },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 9999,
    backgroundColor: "rgba(31,31,31,0.8)",
  },
  spacer: { flex: 1 },
  spinner: { marginBottom: 48 },
  search: { alignItems: "center", gap: 16 },
  tile: {
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  centered: { textAlign: "center", color: "#FFFFFF" },
  pill: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 9999,
    backgroundColor: "#E8B04A",
  },
  ink: { color: "#000000" },
  counter: {
    height: 28,
    paddingHorizontal: 12,
    borderRadius: 9999,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  counterText: { color: "#000000", fontSize: 12, lineHeight: 16 },
  hints: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    columnGap: 16,
  },
  hint: { flexDirection: "row", alignItems: "center", gap: 4 },
  muted: { color: "#9B9B9B" },
  success: { color: "#4FB286" },
  foundWrap: { alignItems: "center", gap: 16 },
  found: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#313131",
    backgroundColor: "rgba(24,24,24,0.92)",
  },
  panel: {
    gap: 12,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#313131",
    backgroundColor: "rgba(24,24,24,0.96)",
  },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1, minWidth: 0 },
});
