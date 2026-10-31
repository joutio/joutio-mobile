import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { CaretRight } from "@/ui/phosphor";
import { compactNumber } from "@/lib/helpers";
import { categoryColor, categoryLabel } from "@/shared/utils/categories";
import { topicName } from "@/shared/utils/topic-name";
import type { Language, TopicCardView } from "@/shared/types/bff";
import { JoCategoryIcon } from "@/ui/jo/jo-category-icon";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

interface JoTopicCardProps {
  topic: TopicCardView;
  language: Language;
  size: "S" | "M" | "row";
  onPress: () => void;
  width?: number;
  subtitle?: string;
  last?: boolean;
}

/** Carte sujet : S en grille, M en rail, `row` en liste. */
export function JoTopicCard({
  topic,
  language,
  size,
  onPress,
  width,
  subtitle,
  last = false,
}: JoTopicCardProps) {
  const { colors } = useNativeTheme();
  const name = topicName(topic.names, language);
  const category = topic.category
    ? categoryLabel(topic.category, topic.categoryLabel ?? undefined)
    : "Sujet";
  const tint = topic.color ?? categoryColor(topic.category ?? "");
  const image = topic.imageUrl ?? topic.bannerUrl;
  // Neutre sous une image : la teinte de catégorie ne flashe pas au chargement.
  const backdrop = image ? colors.hover : tint;
  const followers = `${compactNumber(topic.followersCount)} abonnés`;

  const visual = (
    <>
      {image ? (
        <Image
          source={{ uri: image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
      ) : (
        <JoCategoryIcon category={topic.category} size={size === "row" ? 22 : size === "S" ? 32 : 30} />
      )}
    </>
  );

  if (size === "row") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={name}
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
        <View style={[styles.thumb, { backgroundColor: backdrop }]}>{visual}</View>
        <View style={styles.copy}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {name}
          </AppText>
          <AppText variant="footnote" tone="secondary" numberOfLines={1}>
            {subtitle ?? `${category} · ${followers}`}
          </AppText>
        </View>
        <CaretRight size={16} color={colors.secondaryLabel} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width,
          backgroundColor: colors.raised,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.cover,
          { backgroundColor: backdrop, aspectRatio: size === "S" ? 1 : 16 / 10 },
        ]}
      >
        {visual}
      </View>
      <View style={styles.body}>
        <AppText
          variant={size === "S" ? "caption" : "callout"}
          weight="semibold"
          numberOfLines={1}
        >
          {name}
        </AppText>
        <View style={styles.meta}>
          <AppText
            variant="caption"
            weight="semibold"
            numberOfLines={1}
            style={[styles.category, { color: tint }]}
          >
            {category}
          </AppText>
          {size === "M" ? (
            <AppText variant="footnote" tone="secondary" numberOfLines={1}>
              {compactNumber(topic.followersCount)}
            </AppText>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, overflow: "hidden" },
  cover: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  body: { paddingTop: 8, paddingHorizontal: 12, paddingBottom: 12, gap: 2 },
  meta: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  category: { flexShrink: 1 },
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
  copy: { flex: 1, minWidth: 0 },
});
