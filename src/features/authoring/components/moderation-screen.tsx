import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  CheckCircleIcon,
  EmptyState,
  FeedFooter,
  Field,
  ListGroup,
  ListRow,
  MobileSheet,
  MobileTopBar,
  ModerationCard,
  PencilSimpleIcon,
  Screen,
  Skeleton,
  DragToLoadMore,
  TabLoadMoreScrollView,
  TabsScrollView,
  Text,
  tokens,
  WarningIcon,
} from '@/design-system'
import { useMe } from '@/features/me'
import {
  contentFor,
  questionStatus,
  questionText,
  QUESTION_CHOICES,
  reasonsLabel,
  type QuestionEditorView,
  type QuestionReportReason,
} from '../domain/authoring'
import { MAX_REJECT } from '../domain/limits'
import { useMyTopic, useDismissReports, useModerateQuestion, useTopicQuestions, useTopicReports, type ReportedQuestion } from '../hooks/use-authoring'
import { openQuestionEditor } from './questions-screen'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'

const PAGE_SIZE = 20
const PAGE = { gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }
type Tab = 'pending' | 'reports'

const answersOf = (question: QuestionEditorView) => {
  const content = contentFor(question, 'fr') ?? question.contents[0]
  return QUESTION_CHOICES.map((choice) => content?.answers.find((answer) => answer.choice === choice)?.text ?? '')
}

/** Motifs distincts de tous les signalements ouverts d'une question. */
const reasonsOf = (item: ReportedQuestion) => reasonsLabel([...new Set(item.reports.flatMap((report) => report.reasons))] as QuestionReportReason[])

/**
 * Modération (`creation.md` § 1) : À valider et Signalements, balayables, onglets collés en haut. Approuver retire
 * la question de la file, Rejeter demande un motif, Modifier ouvre l'éditeur. Sans Équipe côté backend, la file À
 * valider contient les questions du créateur lui-même (toute question naît en attente).
 */
export function ModerationScreen() {
  const params = useLocalSearchParams<{ id: string; name?: string; tab?: string }>()
  const topicId = params.id
  const me = useMe(true)
  const workshop = useMyTopic(topicId)
  const questions = useTopicQuestions(topicId)
  const reports = useTopicReports(topicId, workshop.permissions?.canManage ? questions.data : undefined)
  const moderate = useModerateQuestion(topicId)
  const dismiss = useDismissReports(topicId)
  const [tab, setTab] = useState<Tab>(params.tab === 'reports' ? 'reports' : 'pending')
  useEffect(() => {
    if (params.tab === 'reports') setTab('reports')
  }, [params.tab])
  const [rejecting, setRejecting] = useState<QuestionEditorView>()
  const [reason, setReason] = useState('')
  const [report, setReport] = useState<ReportedQuestion>()
  const [pendingPages, setPendingPages] = useState(1)
  const [reportPages, setReportPages] = useState(1)

  const all = questions.data ?? []
  const pending = all.filter((question) => ['pending', 'suspended'].includes(questionStatus(question)))
  const reported = reports.data ?? []
  const shownPending = pending.slice(0, pendingPages * PAGE_SIZE)
  const shownReports = reported.slice(0, reportPages * PAGE_SIZE)
  const pendingSource = clientSource(pendingPages, setPendingPages, shownPending.length < pending.length)
  const reportSource = clientSource(reportPages, setReportPages, shownReports.length < reported.length)
  const numberOf = (question: QuestionEditorView) => all.indexOf(question) + 1
  const author = (question: QuestionEditorView) => (question.creatorId === me.data?.userId ? (me.data?.pseudonym ?? 'Moi') : 'Rédacteur')

  const loading = (
    <View style={{ gap: tokens.space[3] }}>
      <Skeleton shape="card" />
      <Skeleton shape="card" />
    </View>
  )

  const pendingPage = (
    <DragToLoadMore {...loadMoreOptions(pendingSource)}>
      <TabLoadMoreScrollView contentContainerStyle={PAGE}>
        {questions.isPending ? (
          loading
        ) : pending.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} title="Rien à valider" description="Les questions de tes rédacteurs arriveront ici." />
        ) : (
          <>
            {shownPending.map((question) => (
              <ModerationCard
                key={question.questionId}
                author={author(question)}
                question={questionText(question)}
                answers={answersOf(question)}
                correct={QUESTION_CHOICES.indexOf(question.correctAnswer)}
                busy={
                  moderate.isPending && moderate.variables?.questionId === question.questionId
                    ? moderate.variables.decision === 'approve'
                      ? 'approve'
                      : 'reject'
                    : undefined
                }
                onApprove={() => moderate.mutate({ questionId: question.questionId, decision: 'approve' })}
                onReject={() => {
                  setReason('')
                  setRejecting(question)
                }}
                onEdit={() => openQuestionEditor(topicId, numberOf(question), question.questionId)}
              />
            ))}
            <FeedFooter {...feedFooterProps(pendingSource)} endLabel="Tu as vu toutes les questions à valider" />
          </>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )

  const reportsPage = (
    <DragToLoadMore {...loadMoreOptions(reportSource)}>
      <TabLoadMoreScrollView contentContainerStyle={PAGE}>
        {questions.isPending || reports.isPending ? (
          loading
        ) : reports.isError ? (
          <View>
            <Text>Les signalements n’ont pas pu être chargés.</Text>
            <Button onPress={() => void reports.refetch()}>Réessayer</Button>
          </View>
        ) : reported.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} title="Aucun signalement" description="Les signalements des joueurs arriveront ici." />
        ) : (
          <>
            <ListGroup surface="surface">
              {shownReports.map((item, index) => (
                <ListRow
                  key={item.question.questionId}
                  icon={WarningIcon}
                  label={questionText(item.question)}
                  sub={`${reasonsOf(item)} · ${item.reports.length} signaleur${item.reports.length > 1 ? 's' : ''}`}
                  control="chevron"
                  onPress={() => setReport(item)}
                  last={index === shownReports.length - 1}
                />
              ))}
            </ListGroup>
            <FeedFooter {...feedFooterProps(reportSource)} endLabel="Tu as vu tous les signalements" />
          </>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )

  const comments = report?.reports.map((item) => item.comment?.trim()).filter((comment): comment is string => Boolean(comment)) ?? []

  if (workshop.isError || questions.isError)
    return (
      <Screen
        inTabs
        header={
          <MobileTopBar
            variant="inline"
            title="Modération"
            back="Sujet"
            onBack={() => router.replace({ pathname: '/profile/topics/[id]', params: { id: topicId } })}
          />
        }
      >
        <Text>La modération n’est pas disponible.</Text>
        <Button
          onPress={() => {
            void workshop.refetch()
            void questions.refetch()
          }}
        >
          Réessayer
        </Button>
      </Screen>
    )
  if (workshop.isPending) return <Screen>{loading}</Screen>
  if (!workshop.permissions?.canManage)
    return (
      <Screen
        inTabs
        header={
          <MobileTopBar
            variant="inline"
            title="Mes propositions"
            back="Sujet"
            onBack={() => router.replace({ pathname: '/profile/topics/[id]', params: { id: topicId } })}
          />
        }
      >
        {all.length === 0 && <Text>Aucune proposition</Text>}
        {all.map((question) => (
          <ListRow
            key={question.questionId}
            label={questionText(question)}
            sub={question.rejectionReason ?? questionStatus(question)}
            control="chevron"
            onPress={() => openQuestionEditor(topicId, numberOf(question), question.questionId)}
          />
        ))}
      </Screen>
    )

  return (
    <Screen
      inTabs
      scroll={false}
      header={
        <MobileTopBar
          variant="inline"
          back="Sujet"
          onBack={() => router.replace({ pathname: '/profile/topics/[id]', params: { id: topicId } })}
          title="Modération"
        />
      }
      overlay={
        <>
          <MobileSheet
            open={rejecting !== undefined}
            onClose={() => setRejecting(undefined)}
            title="Rejeter la question"
            footer={
              <Button
                full
                variant="tinted"
                tone="destructive"
                disabled={reason.trim() === ''}
                loading={moderate.isPending}
                onPress={() =>
                  rejecting &&
                  moderate.mutate({ questionId: rejecting.questionId, decision: 'reject', reason: reason.trim() }, { onSuccess: () => setRejecting(undefined) })
                }
              >
                Rejeter
              </Button>
            }
          >
            <Field
              label="Motif"
              placeholder="Il sera envoyé au rédacteur"
              multiline
              value={reason}
              maxLength={MAX_REJECT}
              counter={`${reason.length} / ${MAX_REJECT}`}
              onChangeText={setReason}
            />
          </MobileSheet>
          <MobileSheet
            open={report !== undefined}
            onClose={() => setReport(undefined)}
            title="Signalement"
            subtitle={report ? reasonsOf(report) : undefined}
            footer={
              report && (
                <View style={{ gap: tokens.space[2] }}>
                  <Button
                    full
                    icon={PencilSimpleIcon}
                    onPress={() => {
                      const question = report.question
                      setReport(undefined)
                      openQuestionEditor(topicId, numberOf(question), question.questionId, true)
                    }}
                  >
                    Modifier la question
                  </Button>
                  <Button
                    full
                    variant="gray"
                    tone="neutral"
                    loading={dismiss.isPending}
                    onPress={() => dismiss.mutate(report.question.questionId, { onSuccess: () => setReport(undefined) })}
                  >
                    Clore sans modifier
                  </Button>
                </View>
              )
            }
          >
            {report && (
              <View style={{ gap: tokens.space[3] }}>
                <Text variant="headline">{questionText(report.question)}</Text>
                {comments.map((comment, index) => (
                  <Text key={`${index}-${comment}`} variant="callout" color="muted">
                    {comment}
                  </Text>
                ))}
              </View>
            )}
          </MobileSheet>
        </>
      }
    >
      <View style={{ flex: 1 }}>
        <TabsScrollView<Tab>
          label="Modération"
          value={tab}
          onChange={setTab}
          scrollToTopPill={false}
          pages={[
            { value: 'pending', label: `À valider · ${pending.length}`, content: pendingPage },
            { value: 'reports', label: `Signalements · ${reported.length}`, content: reportsPage },
          ]}
        />
      </View>
    </Screen>
  )
}
