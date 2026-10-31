import { useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Bell } from "@/ui/phosphor";
import { useNow } from "@/shared/hooks/useNow";
import { AppButton } from "@/ui/button";
import { AppCard, AppSection } from "@/ui/card";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoLoading } from "@/ui/jo/jo-loading";
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

  if (notifications.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <JoLoading />
      </View>
    );
  }

  const failed = notifications.isError;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={
        groups.length > 0 ? styles.content : styles.centerContent
      }
      refreshControl={
        <RefreshControl
          refreshing={notifications.isRefetching}
          onRefresh={() => void notifications.refetch()}
          tintColor={theme.colors.accent}
          colors={[theme.colors.accent]}
        />
      }
    >
      {groups.length === 0 ? (
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
      ) : (
        groups.map((group) => (
          <AppSection key={group.title} title={group.title}>
            <AppCard padded={false} style={styles.list}>
              {group.items.map((notification, index) => (
                <NotificationRow
                  key={notification.notificationId}
                  notification={notification}
                  now={now}
                  last={index === group.items.length - 1}
                />
              ))}
            </AppCard>
          </AppSection>
        ))
      )}

      {notifications.hasNextPage ? (
        <AppButton
          label="Voir plus"
          variant="plain"
          loading={notifications.isFetchingNextPage}
          onPress={() => void notifications.fetchNextPage()}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerContent: { flexGrow: 1, justifyContent: "center", padding: 16 },
  content: { padding: 16, paddingBottom: 32, gap: 24 },
  list: { overflow: "hidden" },
});
