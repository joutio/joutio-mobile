import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
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
  TabScrollView,
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
import { useDismissReports, useModerateQuestion, useTopicQuestions, useTopicReports, type ReportedQuestion } from '../hooks/use-authoring'
import { openQuestionEditor } from './questions-screen'

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
  const params = useLocalSearchParams<{ id: string; name?: string }>()
  const topicId = params.id
  const me = useMe(true)
  const questions = useTopicQuestions(topicId)
  const reports = useTopicReports(topicId, questions.data)
  const moderate = useModerateQuestion(topicId)
  const dismiss = useDismissReports(topicId)
  const [tab, setTab] = useState<Tab>('pending')
  const [rejecting, setRejecting] = useState<QuestionEditorView>()
  const [reason, setReason] = useState('')
  const [report, setReport] = useState<ReportedQuestion>()
  const [pendingPages, setPendingPages] = useState(1)
  const [reportPages, setReportPages] = useState(1)

  const all = questions.data ?? []
  const pending = all.filter((question) => questionStatus(question) === 'pending')
  const reported = reports.data ?? []
  const shownPending = pending.slice(0, pendingPages * PAGE_SIZE)
  const shownReports = reported.slice(0, reportPages * PAGE_SIZE)
  const numberOf = (question: QuestionEditorView) => all.indexOf(question) + 1
  const author = `${me.data?.pseudonym ?? ''} · Créateur`

  const loading = (
    <View style={{ gap: tokens.space[3] }}>
      <Skeleton shape="card" />
      <Skeleton shape="card" />
    </View>
  )

  const pendingPage = (
    <TabScrollView contentContainerStyle={PAGE}>
      {questions.isPending ? (
        loading
      ) : pending.length === 0 ? (
        <EmptyState icon={CheckCircleIcon} title="Rien à valider" description="Les questions de tes rédacteurs arriveront ici." />
      ) : (
        <>
          {shownPending.map((question) => (
            <ModerationCard
              key={question.questionId}
              author={author}
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
          <FeedFooter
            state={shownPending.length < pending.length ? 'more' : 'end'}
            onLoadMore={() => setPendingPages(pendingPages + 1)}
            endLabel="Tu as vu toutes les questions à valider"
          />
        </>
      )}
    </TabScrollView>
  )

  const reportsPage = (
    <TabScrollView contentContainerStyle={PAGE}>
      {questions.isPending || reports.isPending ? (
        loading
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
          <FeedFooter
            state={shownReports.length < reported.length ? 'more' : 'end'}
            onLoadMore={() => setReportPages(reportPages + 1)}
            endLabel="Tu as vu tous les signalements"
          />
        </>
      )}
    </TabScrollView>
  )

  const comments = report?.reports.map((item) => item.comment?.trim()).filter((comment): comment is string => Boolean(comment)) ?? []

  return (
    <Screen
      inTabs
      scroll={false}
      header={<MobileTopBar variant="inline" back="Sujet" onBack={() => router.back()} title="Modération" />}
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
