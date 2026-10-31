import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  ClockCounterClockwise,
  Crown,
  MapPin,
  Medal,
  UserCircle,
} from "phosphor-react-native";
import { useMe } from "@/features/auth/hooks/useMe";
import { familyIcon } from "@/features/progression/components/family-icon";
import { StreakWeek } from "@/features/progression/components/streak-week";
import { weekDays } from "@/features/progression/domain/streak";
import {
  titleName,
  useActivity,
  useBadges,
  useRewards,
  useTitles,
} from "@/features/progression/hooks/useProgression";
import { eloTier } from "@/shared/utils/elo";
import { AppButton } from "@/ui/button";
import { JoBadge } from "@/ui/jo/jo-badge";
import { JoEloAvatar } from "@/ui/jo/jo-elo-avatar";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoPill } from "@/ui/jo/jo-pill";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoStat } from "@/ui/jo/jo-stat";
import { JoTitleRibbon } from "@/ui/jo/jo-title-ribbon";
import { AppText } from "@/ui/text";
import { tierLabel } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";

const VISIBLE_BADGES = 4;

export function ProfileScreen() {
  const theme = useNativeTheme();
  const { colors } = theme;
  const router = useRouter();
  const me = useMe();
  const userId = me.data?.userId;
  const activity = useActivity(userId);
  const collection = useBadges(userId);
  const titles = useTitles(userId);
  const rewards = useRewards();

  if (me.isPending) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <JoLoading />
      </View>
    );
  }

  if (!me.data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <AppText variant="headline">Profil indisponible</AppText>
        <AppButton
          label="Réessayer"
          variant="secondary"
          onPress={() => void me.refetch()}
        />
      </View>
    );
  }

  const data = me.data;
  const { rating, provisional } = data.progression;
  const equipped = titles.data?.titles.find(
    (title) => title.key === titles.data.equippedKey,
  );
  const earned =
    collection.data?.families.flatMap((family) =>
      family.badges
        .filter((badge) => badge.earned)
        .map((badge) => ({ ...badge, family: family.family })),
    ) ?? [];
  const activeDays = new Set(
    activity.data?.days.filter((day) => day.games > 0).map((day) => day.date),
  );
  const tier = eloTier(rating);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <View style={styles.identity}>
        <JoEloAvatar
          name={data.pseudonym}
          avatarOptions={data.avatarOptions}
          size={96}
          tier={provisional ? null : tier}
        />
        <AppText variant="title1" weight="bold" style={styles.name}>
          {data.pseudonym}
        </AppText>
        {equipped ? (
          <JoTitleRibbon
            tier={equipped.tier}
            text={titleName(equipped, data.language)}
            width={200}
          />
        ) : null}
        <View style={styles.pills}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voir ma progression"
            onPress={() => router.push("/me/progression")}
          >
            {provisional ? (
              <JoPill label={`Provisoire · ${rating}`} />
            ) : (
              <JoPill tier={tier} label={`${tierLabel(tier)} · ${rating}`} />
            )}
          </Pressable>
          {data.country ? (
            <JoPill
              label={data.country}
              icon={<MapPin size={14} color={colors.secondaryLabel} />}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.stats}>
        <JoStat label="Parties" value={data.stats.played} />
        <JoStat label="Abonnés" value={data.followersCount} />
        <JoStat label="Abonnements" value={data.followingCount} />
      </View>

      {activity.data ? (
        <View style={styles.section}>
          <JoSectionHeader
            title="Série"
            action="Calendrier"
            onAction={() => router.push("/me/streak")}
          />
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <StreakWeek
              count={activity.data.currentStreak}
              hint={`Record ${activity.data.longestStreak}`}
              week={weekDays(activeDays, new Date())}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <JoSectionHeader title="Collection" />
        <View style={[styles.list, { backgroundColor: colors.surface }]}>
          {earned.length > 0 ? (
            <View style={styles.badges}>
              {earned.slice(-VISIBLE_BADGES).map((badge) => (
                <JoBadge
                  key={badge.code}
                  tier={badge.tier}
                  size={48}
                  icon={familyIcon(badge.family)}
                />
              ))}
            </View>
          ) : null}
          <JoListRow
            label="Badges"
            value={
              collection.data
                ? `${collection.data.earnedCount} / ${collection.data.totalCount}`
                : undefined
            }
            icon={<Medal size={20} color={colors.secondaryLabel} />}
            onPress={() => router.push("/me/badges")}
          />
          <JoListRow
            label="Titres"
            value={titles.data?.titles.length}
            icon={<Crown size={20} color={colors.secondaryLabel} />}
            onPress={() => router.push("/me/titles")}
          />
          <JoListRow
            label="Récompenses"
            value={
              rewards.data
                ? rewards.data.filter((reward) => reward.unlocked).length
                : undefined
            }
            icon={<UserCircle size={20} color={colors.secondaryLabel} />}
            onPress={() => router.push("/me/rewards")}
          />
          <JoListRow
            label="Historique"
            value={data.stats.played}
            icon={<ClockCounterClockwise size={20} color={colors.secondaryLabel} />}
            last
            onPress={() => router.push("/me/history")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  content: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 24 },
  identity: { alignItems: "center", gap: 8 },
  name: { textAlign: "center" },
  pills: { flexDirection: "row", justifyContent: "center", gap: 8 },
  stats: { flexDirection: "row", gap: 8 },
  section: { gap: 12 },
  list: { borderRadius: 16, overflow: "hidden" },
  card: { padding: 16, borderRadius: 16 },
  badges: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
