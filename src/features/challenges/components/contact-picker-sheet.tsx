import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { usePeople } from "@/features/social/hooks/usePeople";
import type { FollowDirection } from "@/lib/services/profiles";
import { eloTier } from "@/shared/utils/elo";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPlayerRow } from "@/ui/jo/jo-player-row";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { useCreateChallenge } from "../hooks/useChallenges";

const DIRECTIONS: { value: FollowDirection; label: string }[] = [
  { value: "following", label: "Mes abonnements" },
  { value: "followers", label: "Mes abonnés" },
];

interface ContactPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
}

/** « Qui veux-tu défier ? » : uniquement les contacts du joueur. */
export function ContactPickerSheet({
  visible,
  onClose,
  topicId,
  topicName,
}: ContactPickerSheetProps) {
  const { colors } = useNativeTheme();
  const { height } = useWindowDimensions();
  const me = useMe();
  const [direction, setDirection] = useState<FollowDirection>("following");
  const people = usePeople(visible ? me.data?.userId : undefined, direction, "");
  const create = useCreateChallenge();
  const players = people.data?.pages.flatMap((page) => page.content) ?? [];

  return (
    <JoSheet
      visible={visible}
      onClose={onClose}
      title="Qui veux-tu défier ?"
      subtitle={topicName}
    >
      <View style={styles.body}>
        <JoSegmented
          options={DIRECTIONS}
          value={direction}
          onChange={setDirection}
        />
        {people.isPending ? (
          <JoLoading />
        ) : players.length === 0 ? (
          <AppText variant="callout" tone="secondary" style={styles.empty}>
            Personne ici pour l'instant.
          </AppText>
        ) : (
          <ScrollView
            nestedScrollEnabled
            style={[
              styles.list,
              { maxHeight: height * 0.55, backgroundColor: colors.raised },
            ]}
          >
            {players.map((player, index) => (
              <JoPlayerRow
                key={player.userId}
                name={player.pseudonym}
                avatarOptions={player.avatarOptions}
                subtitle={`Elo ${player.rating}`}
                tier={player.provisional ? null : eloTier(player.rating)}
                presence={player.presence?.status ?? "OFFLINE"}
                last={index === players.length - 1}
                onPress={() =>
                  create.mutate(
                    { topicId, opponentId: player.userId },
                    { onSuccess: onClose },
                  )
                }
              />
            ))}
          </ScrollView>
        )}
      </View>
    </JoSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 12, paddingHorizontal: 16 },
  list: { borderRadius: 16 },
  empty: { textAlign: "center", paddingVertical: 24 },
});
