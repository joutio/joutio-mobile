import { router } from '@/shared/navigation/router'
import { View } from 'react-native'
import {
  Button,
  EmptyState,
  MobileTopBar,
  RewardCard,
  Screen,
  Skeleton,
  Stat,
  Streak,
  StreakCalendar,
  tokens,
  useTheme,
  WarningCircleIcon,
} from '@/design-system'
import { formatNumber } from '@/features/topic/lib/format'
import { useMyActivity, useMyBadges, useMyRewards } from '../hooks/use-profile'
import { useMe } from '@/features/me'
import { useAvatarPreview } from '@/features/avatar/lib/avatar-preview'
import { avatarStylesFor } from '@/features/avatar/lib/avatar-styles'
import { calendarOf, streakHint, weekOf } from '../lib/streak'
import { useRefreshActive } from '@/shared/hooks/use-refresh-active'

function Card({ children }: { children: React.ReactNode }) {
  const { colors, radius } = useTheme()
  return <View style={[{ borderRadius: radius.lg, backgroundColor: colors.surface, padding: tokens.space[5] }]}>{children}</View>
}

/**
 * Série (`profil.md` § 2) : compteur et semaine, En cours / Record / Jours actifs, calendrier du mois et récompense
 * Micah. Un jour compte dès qu'un duel entre joueurs est terminé ; un jour manqué remet à zéro.
 */
export function StreakScreen() {
  const activity = useMyActivity()
  const pageRefresh = useRefreshActive()
  const badges = useMyBadges()
  const data = activity.data
  const me = useMe(true)
  const rewards = useMyRewards()
  const preview = useAvatarPreview()
  const micah = avatarStylesFor(me.data, rewards.data, badges.data).find((style) => style.id === 'micah')!
  const rewardLoading = me.isPending || rewards.isPending || badges.isPending
  const rewardError = me.isError || rewards.isError || badges.isError
  return (
    <Screen
      onRefresh={pageRefresh.refresh}
      inTabs
      header={<MobileTopBar variant="inline" back="Profil" onBack={() => router.back()} title="Série" />}
      contentStyle={{ gap: tokens.space[5], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }}
    >
      {activity.isPending ? (
        <>
          <Skeleton shape="card" />
          <Skeleton shape="card" style={{ height: 280 }} />
        </>
      ) : activity.isError || !data ? (
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger ta série"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={activity.isRefetching} onPress={() => void activity.refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : (
        <>
          <Card>
            <Streak count={data.currentStreak} hint={streakHint(data)} week={weekOf(data)} />
          </Card>
          <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
            <Stat label="En cours" value={formatNumber(data.currentStreak)} tone="accent" compact />
            <Stat label="Record" value={formatNumber(data.longestStreak)} compact />
            <Stat label="Jours actifs" value={formatNumber(data.totalActiveDays)} compact />
          </View>
          <Card>
            <StreakCalendar {...calendarOf(data)} />
          </Card>
          {rewardLoading ? (
            <Skeleton shape="card" />
          ) : rewardError ? (
            <EmptyState
              icon={WarningCircleIcon}
              title="Impossible de charger Micah"
              description="Vérifie ta connexion, puis réessaie."
              action={
                <Button style={{ alignSelf: 'center' }} onPress={() => void pageRefresh.refresh()}>
                  Réessayer
                </Button>
              }
            />
          ) : (
            <RewardCard
              title={micah.title}
              state={micah.state}
              rule={micah.rule}
              progress={micah.progress}
              progressLabel={micah.progressLabel}
              image={preview('micah')}
            />
          )}
        </>
      )}
    </Screen>
  )
}
