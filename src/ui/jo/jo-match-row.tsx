import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Robot } from "@/ui/phosphor";
import { categoryColor } from "@/shared/utils/categories";
import type { GameHistoryOutcome, TopicRefView } from "@/shared/types/bff";
import { JoCategoryIcon } from "@/ui/jo/jo-category-icon";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const OUTCOME: Partial<Record<GameHistoryOutcome, string>> = {
  WIN: "Victoire",
  LOSS: "Défaite",
  DRAW: "Nul",
  CANCELLED: "Annulée",
  IN_PROGRESS: "En cours",
};

interface JoMatchRowProps {
  title: string;
  subtitle: string;
  topic: TopicRefView;
  outcome: GameHistoryOutcome;
  score: string;
  bot?: boolean;
  last?: boolean;
  onPress?: () => void;
}

/** Ligne de partie : sujet, contexte, issue et score. */
export function JoMatchRow({
  title,
  subtitle,
  topic,
  outcome,
  score,
  bot = false,
  last = false,
  onPress,
}: JoMatchRowProps) {
  const { colors } = useNativeTheme();
  const outcomeColor =
    outcome === "WIN"
      ? colors.success
      : outcome === "LOSS"
        ? colors.danger
        : colors.secondaryLabel;
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.hover : "transparent",
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View>
        <View
          style={[
            styles.thumb,
            {
              backgroundColor: topic.imageUrl
                ? colors.hover
                : (topic.color ?? categoryColor(topic.category ?? "")),
            },
          ]}
        >
          {topic.imageUrl ? (
            <Image
              source={{ uri: topic.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <JoCategoryIcon category={topic.category} size={22} />
          )}
        </View>
        {bot ? (
          <View
            style={[
              styles.bot,
              { backgroundColor: colors.raised, borderColor: colors.surface },
            ]}
          >
            <Robot size={12} color={colors.secondaryLabel} />
          </View>
        ) : null}
      </View>
      <View style={styles.copy}>
        <AppText variant="body" weight="semibold" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="footnote" tone="secondary" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <View style={styles.result}>
        <AppText variant="caption" weight="semibold" style={{ color: outcomeColor }}>
          {OUTCOME[outcome] ?? ""}
        </AppText>
        <AppText variant="numeric" weight="semibold" style={styles.score}>
          {score}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  bot: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  result: { alignItems: "flex-end", gap: 2 },
  score: { fontSize: 14, lineHeight: 20 },
});
