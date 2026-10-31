import { useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { UsersThree } from "@/ui/phosphor";
import { JoSearchField } from "@/ui/jo/jo-search-field";
import { useMe } from "@/features/auth/hooks/useMe";
import { ChallengeTopicSheet } from "@/features/challenges/components/challenge-topic-sheet";
import type { FollowDirection } from "@/lib/services/profiles";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { eloTier } from "@/shared/utils/elo";
import type { PlayerCardView, PresenceStatus } from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPlayerRow } from "@/ui/jo/jo-player-row";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { tierLabel } from "@/ui/tokens";
import { useUserRefresh } from "@/shared/hooks/useUserRefresh";
import { useNativeTheme } from "@/ui/theme";
import { usePeople } from "./hooks/usePeople";

const PRESENCE_ORDER: Record<PresenceStatus, number> = { ONLINE: 0, OFFLINE: 1 };

function presenceOf(player: PlayerCardView): PresenceStatus {
  return player.presence?.status ?? "OFFLINE";
}

function subtitleOf(player: PlayerCardView): string {
  const rank = player.provisional
    ? `Provisoire · ${player.rating}`
    : `${tierLabel(eloTier(player.rating))} · ${player.rating}`;
  return presenceOf(player) === "ONLINE" ? `${rank} · en ligne` : rank;
}

export function SocialScreen() {
  const router = useRouter();
  const { colors } = useNativeTheme();
  const me = useMe();
  const [direction, setDirection] = useState<FollowDirection>("following");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<PlayerCardView | null>(null);
  const debounced = useDebounce(query, 300);
  const people = usePeople(me.data?.userId, direction, debounced);
  const userRefresh = useUserRefresh(people.refetch);

  const players = useMemo(
    () =>
      [...(people.data?.pages.flatMap((page) => page.content) ?? [])].sort(
        (a, b) => PRESENCE_ORDER[presenceOf(a)] - PRESENCE_ORDER[presenceOf(b)],
      ),
    [people.data],
  );

  const header = (
    <View style={styles.header}>
      <JoSearchField
        value={query}
        onChangeText={setQuery}
        placeholder="Chercher un joueur"
      />
      <JoSegmented
        value={direction}
        onChange={setDirection}
        options={[
          {
            value: "following",
            label: `Abonnements · ${me.data?.followingCount ?? 0}`,
          },
          {
            value: "followers",
            label: `Abonnés · ${me.data?.followersCount ?? 0}`,
          },
        ]}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={players}
        keyExtractor={(player) => player.userId}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl
            refreshing={userRefresh.refreshing}
            onRefresh={userRefresh.onRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              { backgroundColor: colors.surface },
              index === 0 && styles.first,
              index === players.length - 1 && styles.last,
            ]}
          >
            <JoPlayerRow
              name={item.pseudonym}
              avatarOptions={item.avatarOptions}
              subtitle={subtitleOf(item)}
              tier={item.provisional ? null : eloTier(item.rating)}
              presence={presenceOf(item)}
              last={index === players.length - 1}
              onPress={() => router.push(`/player/${item.userId}`)}
              trailing={
                <AppButton
                  label="Défier"
                  size="sm"
                  disabled={item.suspended}
                  onPress={() => setTarget(item)}
                />
              }
            />
          </View>
        )}
        onEndReached={() => {
          if (people.hasNextPage && !people.isFetchingNextPage) {
            void people.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          people.isPending ? (
            <JoLoading />
          ) : (
            <JoEmptyState
              icon={<UsersThree size={36} color={colors.accent} weight="fill" />}
              title={
                debounced
                  ? "Aucun joueur trouvé"
                  : direction === "following"
                    ? "Tu ne suis personne pour l'instant"
                    : "Personne ne te suit encore"
              }
              message="Suis les joueurs croisés en duel pour les défier en un geste et voir leurs résultats."
            />
          )
        }
      />
      <ChallengeTopicSheet player={target} onClose={() => setTarget(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32 },
  header: { gap: 12, paddingBottom: 12 },
  first: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  last: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
});
