import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import { useReportDetail } from '@joutio/client/authoring'
import { Screen, Skeleton, toast, tokens } from '@/design-system'
import { router } from '@/shared/navigation/router'
import { useT } from '@/lib/i18n'

/**
 * Signalement ouvert depuis une notification : la notification ne porte que le signalement, l'écran des Signalements
 * est centré sur la question. Le signalement est lu ici, puis l'écran de sa question le remplace ; disparu, la file des
 * signalements du sujet s'ouvre à sa place.
 */
export function ReportLinkScreen() {
  const t = useT()
  const { id, reportId, from } = useLocalSearchParams<{ id: string; reportId: string; from?: string }>()
  const detail = useReportDetail(reportId)
  const questionId = detail.data?.questionId
  const failed = detail.isError
  useEffect(() => {
    if (questionId) router.replace({ pathname: '/workshop/[id]/reports/[questionId]', params: { id, questionId, highlight: reportId, from } })
    else if (failed) {
      toast.info(t('mobile.notifications.contentGone'))
      router.replace({ pathname: '/workshop/[id]/moderation', params: { id, tab: 'reports' } })
    }
  }, [questionId, failed, id, reportId, from, t])
  return (
    <Screen scroll={false}>
      <View accessibilityLabel={t('home.loading')} style={{ gap: tokens.space[3], padding: tokens.space[5] }}>
        <Skeleton shape="card" style={{ height: 160 }} />
        <Skeleton shape="row" />
        <Skeleton shape="row" />
      </View>
    </Screen>
  )
}
