import { useMemo } from "react";
import {
  RefreshControl,
  SectionList,
  StyleSheet,
  View,
} from "react-native";
import { Bell } from "@/ui/phosphor";
import { useNow } from "@/shared/hooks/useNow";
import { useUserRefresh } from "@/shared/hooks/useUserRefresh";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { useNativeTheme } from "@/ui/theme";
import { NotificationRow } from "./components/notification-row";
import { groupNotifications } from "./domain/notification";
import { useNotifications } from "./hooks/useNotifications";

export function NotificationsScreen() {
  const theme = useNativeTheme();
  const notifications = useNotifications();
  const now = useNow(60_000);
  const groups = useMemo(
    () =>
      groupNotifications(
        notifications.data?.pages.flatMap((page) => page.content) ?? [],
        now,
      ),
    [notifications.data, now],
  );

  const sections = useMemo(
    () => groups.map((group) => ({ title: group.title, data: group.items })),
    [groups],
  );
  const { refreshing, onRefresh } = useUserRefresh(notifications.refetch);

  if (notifications.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <JoLoading />
      </View>
    );
  }

  const failed = notifications.isError;

  return (
    <SectionList
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={
        groups.length > 0 ? styles.content : styles.centerContent
      }
      sections={sections}
      keyExtractor={(item) => item.notificationId}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
        />
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.header}>
          <JoSectionHeader title={section.title} />
        </View>
      )}
      renderItem={({ item, index, section }) => (
        <View
          style={[
            { backgroundColor: theme.colors.surface },
            index === 0 && styles.first,
            index === section.data.length - 1 && styles.last,
          ]}
        >
          <NotificationRow
            notification={item}
            now={now}
            last={index === section.data.length - 1}
          />
        </View>
      )}
      ListEmptyComponent={
        <JoEmptyState
          icon={<Bell size={36} color={theme.colors.accent} weight="fill" />}
          title={failed ? "Impossible de charger l'inbox" : "Rien de neuf"}
          message={
            failed
              ? "Vérifie ta connexion puis réessaie."
              : "Tes défis, abonnés et actualités arriveront ici."
          }
          action={failed ? "Réessayer" : undefined}
          onAction={() => void notifications.refetch()}
        />
      }
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (notifications.hasNextPage && !notifications.isFetchingNextPage) {
          void notifications.fetchNextPage();
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerContent: { flexGrow: 1, justifyContent: "center", padding: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  header: { paddingTop: 24, paddingBottom: 12 },
  first: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  last: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
});
