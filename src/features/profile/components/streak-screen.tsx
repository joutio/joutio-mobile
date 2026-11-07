import { router } from 'expo-router'
import { View } from 'react-native'
import {
  Button,
  CalendarCheckIcon,
  EmptyState,
  MobileTopBar,
  ProgressBar,
  Screen,
  Skeleton,
  Stat,
  Streak,
  StreakCalendar,
  TierMedal,
  tokens,
  useTheme,
  WarningCircleIcon,
} from '@/design-system'
import { formatNumber } from '@/features/topic/lib/format'
import { useMyActivity, useMyBadges } from '../hooks/use-profile'
import { calendarOf, nextAssiduity, streakHint, weekOf } from '../lib/streak'
import { useRefreshActive } from '@/shared/hooks/use-refresh-active'

function Card({ children, row = false }: { children: React.ReactNode; row?: boolean }) {
  const { colors, radius } = useTheme()
  return (
    <View
      style={[
        { borderRadius: radius.lg, backgroundColor: colors.surface, padding: tokens.space[5] },
        row && { flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
      ]}
    >
      {children}
    </View>
  )
}

/**
 * Série (`profil.md` § 2) : compteur et semaine, En cours / Record / Jours actifs, calendrier du mois et palier
 * d'assiduité suivant. Un jour compte dès qu'un duel entre joueurs est terminé ; un jour manqué remet à zéro.
 */
export function StreakScreen() {
  const activity = useMyActivity()
  const pageRefresh = useRefreshActive()
  const badges = useMyBadges()
  const data = activity.data
  const next = nextAssiduity(badges.data)
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
          {next && (
            <Card row>
              <TierMedal tier={next.tier} icon={CalendarCheckIcon} size={48} state="locked" />
              <View style={{ flex: 1 }}>
                <ProgressBar value={next.progress} label={next.label} tone={next.tier} />
              </View>
            </Card>
          )}
        </>
      )}
    </Screen>
  )
}
