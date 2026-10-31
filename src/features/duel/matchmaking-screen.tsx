import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CheckCircle,
  GlobeHemisphereWest,
  Robot,
  Users,
  X,
} from "@/ui/phosphor";
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
import { JoCategoryIcon } from "@/ui/jo/jo-category-icon";
import { AppText } from "@/ui/text";
import { EASE, riseIn } from "@/ui/motion";
import { JoLoading } from "@/ui/jo/jo-loading";
import { tierHex, tierLabel } from "@/ui/tokens";
import { DarkTheme } from "@/ui/theme";
import {
  useCancelMatchmaking,
  useMatchmakingTicket,
  useStartMatchmaking,
} from "./hooks/useMatchmaking";
import { useCreateRoom, useStartBotRoom } from "./hooks/useRoom";
import { MatchmakingMap } from "./components/matchmaking-map";

const SEARCH_S = 10;
const SEARCH_MS = SEARCH_S * 1000;
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
        <JoCategoryIcon category={topic?.category} size={size / 2} />
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
          <AppText
            variant="headline"
            numberOfLines={1}
            style={styles.foundName}
          >
            {data?.pseudonym ?? "…"}
          </AppText>
          <AppText variant="footnote" style={styles.muted} numberOfLines={1}>
            {data ? `${rank}${data.country ? ` · ${data.country}` : ""}` : " "}
          </AppText>
        </View>
        <CheckCircle size={30} color="#4FB286" weight="fill" />
      </View>
      <AppText variant="footnote" style={styles.muted}>
        Le duel commence
      </AppText>
    </Animated.View>
  );
}

function Hint({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View style={styles.hint}>
      {icon}
      <AppText variant="footnote" style={styles.muted}>
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
  const opponentId =
    ticket?.status === "COMPLETED" && !ticket.vsBot ? ticket.opponentId : null;
  const opponent = usePlayer(opponentId ?? "").data;
  const found = useMemo(() => {
    if (!opponent) return null;
    const { rating, provisional } = opponent.progression ?? {
      rating: 0,
      provisional: true,
    };
    return {
      name: opponent.pseudonym,
      avatarOptions: opponent.avatarOptions,
      country: opponent.country,
      ring: provisional ? "#313131" : tierHex(eloTier(rating)),
    };
  }, [opponent]);

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
      <MatchmakingMap found={found} />
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
        <View style={styles.spinner}>
          <JoLoading />
        </View>
      ) : !ticket ? (
        <View style={styles.panel}>
          <AppText variant="headline">Recherche introuvable</AppText>
          <AppButton label="Retour" variant="secondary" fullWidth onPress={backToTopic} />
        </View>
      ) : searching ? (
        <View style={styles.search}>
          <View style={styles.searchHead}>
            <TopicTile topic={topic} size={60} />
            <AppText variant="title2" weight="semibold" style={styles.centered}>
              {label}
            </AppText>
          </View>
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
          <Pressable
            accessibilityRole="button"
            disabled={cancel.isPending}
            onPress={close}
            style={({ pressed }) => [
              styles.cancel,
              { transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <AppText variant="callout" weight="semibold" style={styles.white}>
              Annuler
            </AppText>
          </Pressable>
        </View>
      ) : ticket.status === "COMPLETED" ? (
        ticket.opponentId && !ticket.vsBot ? (
          <OpponentFound opponentId={ticket.opponentId} />
        ) : (
          <View style={styles.spinner}>
          <JoLoading />
        </View>
        )
      ) : (
        <View style={styles.panel}>
          <View style={styles.panelHead}>
            <TopicTile topic={topic} size={44} />
            <View style={styles.flex}>
              <AppText variant="headline" style={styles.foundName}>
                {ticket.status === "EXPIRED"
                  ? "Aucun adversaire trouvé"
                  : ticket.status === "FAILED"
                    ? "Recherche impossible"
                    : "Recherche annulée"}
              </AppText>
              <AppText variant="footnote" style={styles.muted} numberOfLines={1}>
                {ticket.status === "EXPIRED"
                  ? `${label} · ${SEARCH_S} s de recherche`
                  : label}
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
            style={styles.primary}
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
              style={styles.half}
              loading={retry.isPending}
              onPress={() => retry.mutate(ticket.topicId)}
            />
            <AppButton
              label="Défier un ami"
              variant="secondary"
              fullWidth
              style={styles.half}
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
  search: { alignItems: "center", gap: 16, paddingBottom: 32 },
  searchHead: { alignItems: "center", gap: 8 },
  cancel: {
    alignSelf: "stretch",
    height: 50,
    marginTop: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#313131",
    backgroundColor: "rgba(31,31,31,0.9)",
  },
  white: { color: "#FFFFFF" },
  foundName: { fontSize: 18, lineHeight: 28, color: "#FFFFFF" },
  primary: { height: 50 },
  half: { flex: 1, minWidth: 0, height: 46 },
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
  foundWrap: { alignItems: "center", gap: 16, paddingBottom: 32 },
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
    marginBottom: 32,
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
