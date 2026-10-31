import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ArrowsDownUp,
  MagnifyingGlass,
  SlidersHorizontal,
} from "phosphor-react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { TopicFiltersSheet } from "@/features/topics/components/topic-filters-sheet";
import { useTopicFacets, useTopicsList } from "@/features/topics/hooks/useTopics";
import {
  TOPIC_SORTS,
  useTopicFilterStore,
} from "@/features/topics/stores/useTopicFilterStore";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { AppButton } from "@/ui/button";
import { JoChip } from "@/ui/jo/jo-chip";
import { JoIconButton } from "@/ui/jo/jo-icon-button";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoTopicCard } from "@/ui/jo/jo-topic-card";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";

const GUTTER = 16;
const GAP = 12;

export function TopicsScreen() {
  const router = useRouter();
  const theme = useNativeTheme();
  const { colors } = theme;
  const { width } = useWindowDimensions();
  const store = useTopicFilterStore();
  const debounced = useDebounce(store.q, 300);
  const me = useMe();
  const language = me.data?.language ?? "fr";
  const [filtersOpen, setFiltersOpen] = useState(false);

  const topicsQuery = useTopicsList({
    q: debounced,
    category: store.category ?? undefined,
    followed: store.followedOnly,
    sort: store.sort,
  });
  const facets = useTopicFacets({
    q: debounced,
    followed: store.followedOnly,
  });

  const topics = useMemo(
    () => topicsQuery.data?.pages.flatMap((page) => page.content) ?? [],
    [topicsQuery.data],
  );
  const total = topicsQuery.data?.pages[0]?.totalElements ?? 0;
  const cardWidth = Math.floor((width - GUTTER * 2 - GAP) / 2);
  const categories = facets.data?.categories ?? [];
  const activeFilters = (store.category ? 1 : 0) + (store.followedOnly ? 1 : 0);
  const sortLabel =
    TOPIC_SORTS.find((sort) => sort.value === store.sort)?.label ?? "Trier";

  const header = (
    <View style={styles.header}>
      <View style={styles.searchRow}>
        <View style={[styles.search, { backgroundColor: colors.raised }]}>
          <MagnifyingGlass size={20} color={colors.secondaryLabel} />
          <TextInput
            value={store.q}
            onChangeText={store.setQuery}
            placeholder="Chercher un sujet"
            placeholderTextColor={colors.secondaryLabel}
            selectionColor={colors.accent}
            autoCapitalize="none"
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.label }]}
          />
        </View>
        <View style={[styles.filters, { backgroundColor: colors.raised }]}>
          <JoIconButton
            label="Filtres"
            icon={<SlidersHorizontal size={20} color={colors.label} />}
            count={activeFilters}
            onPress={() => setFiltersOpen(true)}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chips}
        contentContainerStyle={styles.chipsContent}
      >
        <JoChip
          label="Tous"
          selected={store.category === null}
          onPress={() => store.setCategory(null)}
        />
        {categories.map((item) => (
          <JoChip
            key={item.category}
            label={item.label}
            selected={store.category === item.category}
            onPress={() => store.setCategory(item.category)}
          />
        ))}
      </ScrollView>

      <View style={styles.summary}>
        <AppText variant="callout" tone="secondary">
          {topicsQuery.isPending ? "Chargement…" : `${total} sujets`}
        </AppText>
        <JoChip
          label={sortLabel}
          menu
          icon={<ArrowsDownUp size={16} color={colors.label} />}
          onPress={() => setFiltersOpen(true)}
        />
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={topics}
        keyExtractor={(topic) => topic.topicId}
        numColumns={2}
        columnWrapperStyle={{ gap: GAP }}
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <JoTopicCard
            topic={item}
            language={language}
            size="S"
            width={cardWidth}
            onPress={() => router.push(`/topic/${item.topicId}`)}
          />
        )}
        onEndReached={() => {
          if (topicsQuery.hasNextPage && !topicsQuery.isFetchingNextPage) {
            void topicsQuery.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          topicsQuery.isPending ? (
            <JoLoading />
          ) : (
            <View style={styles.empty}>
              <AppText variant="headline">Aucun sujet ne correspond</AppText>
              <AppText
                variant="callout"
                tone="secondary"
                style={{ textAlign: "center" }}
              >
                Essaie une autre recherche ou retire les filtres.
              </AppText>
              <AppButton
                label="Réinitialiser"
                variant="secondary"
                onPress={() => store.reset()}
              />
            </View>
          )
        }
        ListFooterComponent={
          topicsQuery.isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : undefined
        }
      />

      <TopicFiltersSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        categories={categories}
        total={total}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, paddingTop: 4, paddingBottom: 32, gap: GAP },
  header: { gap: 12 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  search: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchInput: { flex: 1, fontFamily: "Geist_400Regular", fontSize: 16 },
  filters: { borderRadius: 9999 },
  chips: { marginHorizontal: -GUTTER },
  chipsContent: { gap: 8, paddingHorizontal: GUTTER },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  empty: { alignItems: "center", gap: 12, paddingVertical: 56 },
  footer: { paddingVertical: 16, alignItems: "center" },
});
