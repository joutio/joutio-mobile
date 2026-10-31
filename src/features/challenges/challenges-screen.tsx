import { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Lightning, X } from "phosphor-react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { showToast } from "@/lib/toast";
import { topicName } from "@/shared/utils/topic-name";
import type { ChallengeView } from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { AppCard, AppSection } from "@/ui/card";
import { JoChip } from "@/ui/jo/jo-chip";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPlayerRow } from "@/ui/jo/jo-player-row";
import { AppListRow } from "@/ui/list-row";
import { useNativeTheme } from "@/ui/theme";
import { remainingLabel } from "./domain/challenge";
import {
  useAcceptChallenge,
  useCancelChallenge,
  useDeclineChallenge,
  usePendingChallenges,
} from "./hooks/useChallenges";
import { TOPICS_HREF } from "@/lib/navigation";

type Filter = "all" | "received" | "sent" | "rooms";

const FAILURE = { title: "Action impossible, réessaie.", tone: "danger" } as const;

export function ChallengesScreen() {
  const router = useRouter();
  const theme = useNativeTheme();
  const me = useMe();
  const pending = usePendingChallenges();
  const accept = useAcceptChallenge();
  const decline = useDeclineChallenge();
  const cancel = useCancelChallenge();
  const [filter, setFilter] = useState<Filter>("all");
  const language = me.data?.language ?? "fr";
  const { received, sent, rooms, now, total } = pending;

  const contextOf = (challenge: ChallengeView) =>
    `${topicName(challenge.topic.names, language)} · expire dans ${remainingLabel(
      challenge.expiresAt,
      now,
    )}`;

  const onAccept = (challengeId: string) =>
    accept.mutate(challengeId, {
      onSuccess: (roomId) => {
        if (roomId) router.push(`/(app)/room/${roomId}`);
        else showToast({ title: "Ce défi n'est plus disponible.", tone: "danger" });
      },
      onError: () => showToast(FAILURE),
    });

  if (pending.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <JoLoading />
      </View>
    );
  }

  const refresh = (
    <RefreshControl
      refreshing={pending.isRefetching}
      onRefresh={() => void pending.refetch()}
      tintColor={theme.colors.accent}
      colors={[theme.colors.accent]}
    />
  );

  if (pending.isError && total === 0) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.centerContent}
        refreshControl={refresh}
      >
        <JoEmptyState
          icon={<Lightning size={36} color={theme.colors.accent} weight="fill" />}
          title="Impossible de charger tes défis"
          message="Vérifie ta connexion puis réessaie."
          action="Réessayer"
          onAction={() => void pending.refetch()}
        />
      </ScrollView>
    );
  }

  if (total === 0) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.centerContent}
        refreshControl={refresh}
      >
        <JoEmptyState
          icon={<Lightning size={36} color={theme.colors.accent} weight="fill" />}
          title="Aucun défi en cours"
          message="Choisis un sujet pour créer un salon privé et partager son lien."
          action="Créer un salon privé"
          onAction={() => router.navigate(TOPICS_HREF)}
        />
      </ScrollView>
    );
  }

  const show = (section: Exclude<Filter, "all">, count: number) =>
    count > 0 && (filter === "all" || filter === section);

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      refreshControl={refresh}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        <JoChip
          label="Tous"
          selected={filter === "all"}
          onPress={() => setFilter("all")}
        />
        <JoChip
          label="Reçus"
          count={received.length}
          selected={filter === "received"}
          onPress={() => setFilter("received")}
        />
        <JoChip
          label="Envoyés"
          count={sent.length}
          selected={filter === "sent"}
          onPress={() => setFilter("sent")}
        />
        <JoChip
          label="Salons"
          count={rooms.length}
          selected={filter === "rooms"}
          onPress={() => setFilter("rooms")}
        />
      </ScrollView>

      {show("received", received.length) ? (
        <AppSection title="Reçus">
          <AppCard padded={false} style={styles.list}>
            {received.map((challenge, index) => (
              <JoPlayerRow
                key={challenge.challengeId}
                name={challenge.challenger?.pseudonym ?? "Un joueur"}
                avatarOptions={challenge.challenger?.avatarOptions}
                subtitle={contextOf(challenge)}
                last={index === received.length - 1}
                trailing={
                  <>
                    <JoIconButton
                      label="Refuser le défi"
                      icon={<X size={20} color={theme.colors.secondaryLabel} />}
                      onPress={() =>
                        decline.mutate(challenge.challengeId, {
                          onError: () => showToast(FAILURE),
                        })
                      }
                    />
                    <AppButton
                      label="Accepter"
                      size="sm"
                      loading={
                        accept.isPending &&
                        accept.variables === challenge.challengeId
                      }
                      disabled={accept.isPending}
                      onPress={() => onAccept(challenge.challengeId)}
                    />
                  </>
                }
              />
            ))}
          </AppCard>
        </AppSection>
      ) : null}

      {show("sent", sent.length) ? (
        <AppSection title="Envoyés">
          <AppCard padded={false} style={styles.list}>
            {sent.map((challenge, index) => (
              <JoPlayerRow
                key={challenge.challengeId}
                name={challenge.opponent?.pseudonym ?? "Un joueur"}
                avatarOptions={challenge.opponent?.avatarOptions}
                subtitle={contextOf(challenge)}
                last={index === sent.length - 1}
                trailing={
                  <AppButton
                    label="Annuler"
                    size="sm"
                    variant="secondary"
                    disabled={cancel.isPending}
                    onPress={() =>
                      cancel.mutate(challenge.challengeId, {
                        onError: () => showToast(FAILURE),
                      })
                    }
                  />
                }
              />
            ))}
          </AppCard>
        </AppSection>
      ) : null}

      {show("rooms", rooms.length) ? (
        <AppSection title="Salons privés">
          <AppCard padded={false} style={styles.list}>
            {rooms.map((room, index) => (
              <AppListRow
                key={room.roomId}
                title={topicName(room.topic.names, language)}
                subtitle={`En attente d'un joueur · expire dans ${remainingLabel(
                  room.expiresAt,
                  now,
                )}`}
                last={index === rooms.length - 1}
                onPress={() => router.push(`/(app)/room/${room.roomId}`)}
              />
            ))}
          </AppCard>
        </AppSection>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerContent: { flexGrow: 1, justifyContent: "center", padding: 16 },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 24 },
  filters: { gap: 8 },
  list: { overflow: "hidden" },
});
