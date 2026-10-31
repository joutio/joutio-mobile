import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { AppButton } from "@/ui/button";
import { JoChip } from "@/ui/jo/jo-chip";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { useNativeTheme } from "@/ui/theme";
import type { TopicFacetView } from "@/shared/types/bff";
import {
  TOPIC_SORTS,
  useTopicFilterStore,
} from "../stores/useTopicFilterStore";

interface TopicFiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  categories: TopicFacetView[];
  total: number;
}

/** Feuille Filtres : univers, tri et sujets suivis, résultat en direct. */
export function TopicFiltersSheet({
  visible,
  onClose,
  categories,
  total,
}: TopicFiltersSheetProps) {
  const { colors } = useNativeTheme();
  const store = useTopicFilterStore();
  const { height } = useWindowDimensions();

  return (
    <JoSheet
      visible={visible}
      onClose={onClose}
      title="Filtres"
      action="Réinitialiser"
      onAction={store.reset}
    >
      <ScrollView
        nestedScrollEnabled
        style={{ maxHeight: height * 0.62 }}
        contentContainerStyle={styles.content}
      >
        <View style={styles.section}>
          <JoSectionHeader title="Univers" />
          <View style={styles.chips}>
            {categories.map((item) => (
              <JoChip
                key={item.category}
                label={item.label}
                count={item.count}
                selected={store.category === item.category}
                onPress={() =>
                  store.setCategory(
                    store.category === item.category ? null : item.category,
                  )
                }
              />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <JoSectionHeader title="Trier par" />
          <View style={[styles.list, { backgroundColor: colors.raised }]}>
            {TOPIC_SORTS.map((sort, index) => (
              <JoListRow
                key={sort.value}
                label={sort.label}
                control="radio"
                on={store.sort === sort.value}
                last={index === TOPIC_SORTS.length - 1}
                onPress={() => store.setSort(sort.value)}
              />
            ))}
          </View>
        </View>

        <View style={[styles.list, { backgroundColor: colors.raised }]}>
          <JoListRow
            label="Uniquement mes sujets suivis"
            control="toggle"
            on={store.followedOnly}
            last
            onPress={() => store.setFollowedOnly(!store.followedOnly)}
          />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <AppButton
          label={`Afficher ${total} sujets`}
          size="lg"
          fullWidth
          onPress={onClose}
        />
      </View>
    </JoSheet>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 24 },
  section: { gap: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  list: { borderRadius: 16, overflow: "hidden" },
  footer: { paddingHorizontal: 16 },
});
