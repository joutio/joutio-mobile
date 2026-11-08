import { router, useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { View } from 'react-native'
import { Button, MobileTopBar, Screen, Text, tokens } from '@/design-system'
import { authoringService } from '../lib/authoring-service'
import { useDismissReports, useTopicQuestions } from '../hooks/use-authoring'
import { questionText, reasonsLabel } from '../domain/authoring'
import { openQuestionEditor } from './questions-screen'

export function ReportDetailScreen() {
  const { id, reportId } = useLocalSearchParams<{ id: string; reportId: string }>()
  const detail = useQuery({ queryKey: ['authoring', id, 'report-detail', reportId], queryFn: () => authoringService.reportDetail(reportId), retry: false })
  const questions = useTopicQuestions(id)
  const dismiss = useDismissReports(id)
  const back = () => router.replace({ pathname: '/profile/topics/[id]/moderation', params: { id, tab: 'reports' } })
  const report = detail.data?.report
  const question = questions.data?.find((q) => q.questionId === detail.data?.questionId)
  return (
    <Screen
      inTabs
      header={<MobileTopBar variant="inline" title="Signalement" back="Modération" onBack={back} />}
      contentStyle={{ paddingHorizontal: tokens.space[5], gap: tokens.space[4] }}
    >
      {detail.isPending ? (
        <Text>Chargement du signalement…</Text>
      ) : detail.isError ? (
        <>
          <Text>Ce signalement est indisponible ou tu n’as plus accès à sa modération.</Text>
          <Button onPress={() => void detail.refetch()}>Réessayer</Button>
          <Button variant="gray" onPress={back}>
            Retour à la modération
          </Button>
        </>
      ) : (
        report && (
          <>
            <Text variant="headline">{question ? questionText(question) : 'Question indisponible'}</Text>
            <Text>{reasonsLabel(report.reasons)}</Text>
            {report.comment && <Text>{report.comment}</Text>}
            <Text color="muted">{report.status === 'OPEN' ? 'Signalement ouvert' : 'Signalement clôturé'}</Text>
            {report.status === 'OPEN' && question && (
              <View style={{ gap: tokens.space[2] }}>
                <Button onPress={() => openQuestionEditor(id, 1, question.questionId, true)}>Modifier la question</Button>
                <Button variant="gray" loading={dismiss.isPending} onPress={() => dismiss.mutate(question.questionId, { onSuccess: back })}>
                  Clore sans modifier
                </Button>
              </View>
            )}
          </>
        )
      )}
    </Screen>
  )
}
