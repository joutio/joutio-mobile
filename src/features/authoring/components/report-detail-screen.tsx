import { useWorkshopNavigation } from '../hooks/use-workshop-navigation'
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { BackHandler } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState, useEffect } from 'react'
import { Image } from 'expo-image'
import { View } from 'react-native'
import { Button, MobileTopBar, Screen, Text, tokens } from '@/design-system'
import { authoringService } from '../lib/authoring-service'
import { useDismissReports, useTopicQuestions, useMyTopic } from '../hooks/use-authoring'
import { reasonsLabel, contentFor, QUESTION_CHOICES } from '../domain/authoring'
import { openQuestionEditor } from './questions-screen'

export function ReportDetailScreen() {
  const { inTabs, base } = useWorkshopNavigation()
  const { id, reportId } = useLocalSearchParams<{ id: string; reportId: string }>()
  const detail = useQuery({ queryKey: ['authoring', id, 'report-detail', reportId], queryFn: () => authoringService.reportDetail(reportId), retry: false })
  const questions = useTopicQuestions(id)
  const [imageFailed, setImageFailed] = useState(false)
  const workshop = useMyTopic(id)
  const dismiss = useDismissReports(id)
  const [leaving, setLeaving] = useState(false)
  const back = () => setLeaving(true)
  usePreventRemove(!leaving, back)
  useEffect(() => {
    if (leaving) router.dismissTo({ pathname: `${base}/moderation`, params: { id, tab: 'reports' } })
  }, [leaving, id, base])
  const report = detail.data?.report
  const question = questions.data?.find((q) => q.questionId === detail.data?.questionId)
  const others = useQuery({
    queryKey: ['authoring', id, 'question-reports', question?.questionId],
    queryFn: () => authoringService.reports(question!.questionId),
    enabled: Boolean(question),
  })
  useFocusEffect(useCallback(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { back(); return true })
    return () => listener.remove()
  }, [id, base]))
  const content = question ? contentFor(question, report?.language ?? 'fr') ?? contentFor(question, 'fr') ?? question.contents[0] : undefined
  const items = others.data ?? (report ? [report] : [])
  const available = question && report?.status === 'OPEN' && workshop.permissions?.canManage && !detail.isError && !questions.isError
  return (
    <Screen
      inTabs={inTabs}
      header={<MobileTopBar variant="inline" title="Signalement" back="Signalements" onBack={back} />}
      bottomBar={available ? (
        <View style={{ padding: tokens.space[5], gap: tokens.space[2] }}>
          <Text variant="caption" color="muted">Ces actions traitent tous les signalements ouverts de cette question.</Text>
          <Button full disabled={dismiss.isPending} onPress={() => openQuestionEditor(id, 1, question.questionId, true, inTabs ? 'profile' : 'workshop')}>Modifier la question</Button>
          <Button full variant="gray" loading={dismiss.isPending} onPress={() => dismiss.mutate(question.questionId, { onSuccess: back })}>Clore sans modifier</Button>
        </View>
      ) : undefined}
      contentStyle={{ paddingHorizontal: tokens.space[5], gap: tokens.space[4] }}
    >
      {detail.isPending || questions.isPending ? (
        <Text>Chargement du signalement…</Text>
      ) : detail.isError || questions.isError ? (
        <>
          <Text>Ce signalement est indisponible ou tu n’as plus accès à sa modération.</Text>
          <Button onPress={() => { void detail.refetch(); void questions.refetch(); void workshop.refetch() }}>Réessayer</Button>
          <Button variant="gray" onPress={back}>
            Retour à la modération
          </Button>
        </>
      ) : (
        report && (
          <>
            <Text variant="headline">{workshop.topic?.names.fr ?? 'Signalements'}</Text>
            {others.isError && <Button onPress={() => void others.refetch()}>Réessayer les autres signalements</Button>}
            {items.map((item) => (
              <View key={item.reportId} style={{ gap: tokens.space[2] }}>
                {item.reportId === reportId && <Text weight="600">Signalement sélectionné</Text>}
                <Text>{reasonsLabel(item.reasons)}</Text>
                {item.comment && <Text>{item.comment}</Text>}
                <Text variant="caption" color="muted">{new Date(item.createdAt).toLocaleDateString('fr')} · {item.status === 'OPEN' ? 'Ouvert' : 'Clôturé'}</Text>
              </View>
            ))}
            <Text variant="caption" color="muted">État actuel de la question : son contenu peut avoir changé depuis le signalement.</Text>
            {question && content ? (
              <>
                <Text variant="headline">{content.text}</Text>
                {question.imageUrl && <Image onError={() => setImageFailed(true)} source={{ uri: question.imageUrl }} style={{ width: '100%', aspectRatio: 5 / 4 }} contentFit="contain" accessibilityLabel="Illustration de la question" />}
                {imageFailed && <Text>Illustration indisponible</Text>}
                {QUESTION_CHOICES.map((choice) => (
                  <Text key={choice} weight={choice === question.correctAnswer ? '600' : undefined}>
                    {choice + ' · ' + (content.answers.find((answer) => answer.choice === choice)?.text ?? '') + (choice === question.correctAnswer ? ' · Bonne réponse' : '')}
                  </Text>
                ))}
              </>
            ) : <Text>Question indisponible</Text>}
          </>
        )
      )}
    </Screen>
  )
}
