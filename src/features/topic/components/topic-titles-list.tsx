import { StyleSheet, View } from "react-native";
import { Check, Lock } from "@/ui/phosphor";
import {
  MASTERY_TIERS,
  masteryTierIndex,
  masteryTierLabel,
} from "@/shared/utils/mastery";
import type { Language, TopicProgressView } from "@/shared/types/bff";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { useNativeTheme } from "@/ui/theme";

interface TopicTitlesListProps {
  titles: Record<string, Record<string, string>> | null;
  progress: TopicProgressView;
  language: Language;
}

/** Titres du sujet par palier, débloqués avec la maîtrise. */
export function TopicTitlesList({
  titles,
  progress,
  language,
}: TopicTitlesListProps) {
  const { colors } = useNativeTheme();
  const names = titles?.[language] ?? titles?.fr ?? {};
  const reached = progress.games > 0 ? masteryTierIndex(progress.tier) : -1;

  return (
    <View style={[styles.list, { backgroundColor: colors.surface }]}>
      {MASTERY_TIERS.map((tier, index) => (
        <JoListRow
          key={tier}
          label={names[tier] ?? masteryTierLabel(tier)}
          sub={masteryTierLabel(tier)}
          control="none"
          last={index === MASTERY_TIERS.length - 1}
          icon={
            index <= reached ? (
              <Check size={20} color={colors.accentInk} />
            ) : (
              <Lock size={20} color={colors.secondaryLabel} />
            )
          }
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { borderRadius: 16, overflow: "hidden" },
});
