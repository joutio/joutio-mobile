import { ScrollView, StyleSheet, View } from "react-native";
import { Crown } from "phosphor-react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { topicName } from "@/shared/utils/topic-name";
import { masteryTierLabel } from "@/shared/utils/mastery";
import { AppButton } from "@/ui/button";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPill } from "@/ui/jo/jo-pill";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoTitleRibbon } from "@/ui/jo/jo-title-ribbon";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { titleName, useEquipTitle, useTitles } from "./hooks/useProgression";

export function TitlesScreen() {
  const { colors } = useNativeTheme();
  const me = useMe();
  const userId = me.data?.userId;
  const language = me.data?.language ?? "fr";
  const titles = useTitles(userId);
  const equip = useEquipTitle(userId);
  const all = titles.data?.titles ?? [];
  const equipped = all.find((title) => title.key === titles.data?.equippedKey);
  const others = all.filter((title) => title !== equipped);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      {titles.isPending ? <JoLoading /> : null}

      {!titles.isPending && all.length === 0 ? (
        <JoEmptyState
          icon={<Crown size={36} color={colors.accent} weight="fill" />}
          title="Aucun titre pour l'instant"
          message="Termine un duel entre joueurs sur un sujet pour débloquer ton premier titre."
        />
      ) : null}

      {equipped ? (
        <View
          style={[
            styles.equipped,
            { backgroundColor: colors.warm, borderColor: colors.accent },
          ]}
        >
          <JoPill label="Porté" />
          <JoTitleRibbon
            tier={equipped.tier}
            text={titleName(equipped, language)}
            width={260}
          />
          <AppText variant="callout" tone="secondary" style={styles.centered}>
            {masteryTierLabel(equipped.tier)} ·{" "}
            {topicName(equipped.topic.names, language)}
          </AppText>
          <AppButton
            label="Ne plus porter"
            variant="plain"
            size="sm"
            loading={equip.isPending}
            onPress={() => equip.mutate(null)}
          />
        </View>
      ) : null}

      {others.length > 0 ? (
        <View style={styles.section}>
          <JoSectionHeader title="Débloqués" count={String(all.length)} />
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {others.map((title, index) => (
              <View
                key={title.key}
                style={[
                  styles.row,
                  {
                    borderBottomWidth: index === others.length - 1 ? 0 : 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <JoTitleRibbon
                  tier={title.tier}
                  text={titleName(title, language)}
                  width={132}
                />
                <AppText
                  variant="caption"
                  tone="secondary"
                  numberOfLines={2}
                  style={styles.topic}
                >
                  {topicName(title.topic.names, language)}
                </AppText>
                <AppButton
                  label="Porter"
                  variant="secondary"
                  size="sm"
                  disabled={equip.isPending}
                  onPress={() => equip.mutate(title.key)}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { gap: 24, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  equipped: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  centered: { textAlign: "center" },
  section: { gap: 12 },
  list: { borderRadius: 16, overflow: "hidden" },
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  topic: { flex: 1, minWidth: 0 },
});
