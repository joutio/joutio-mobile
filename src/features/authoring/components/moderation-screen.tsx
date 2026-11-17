import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { zodResolver } from '@hookform/resolvers/zod'
import { rejectQuestionSchema } from '@joutio/client/forms'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
  ProhibitIcon,
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
  type QuestionEditorView,
  type ReportedQuestion,
} from '@joutio/client/authoring'
import type { QuestionReportReason } from '@joutio/client/api-types'
import { MAX_REJECT } from '@joutio/client/authoring'
import { useMyTopic, useModerateQuestion, useReportQueue, useTopicQuestions } from '../hooks/use-authoring'
import { openQuestionEditor } from './questions-screen'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'
import { reasonsLabel, reportsLabel, t, useT } from '@/lib/i18n'

const PAGE_SIZE = 20
const PAGE = { gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: tokens.space[7] }
type Tab = 'pending' | 'reports'

const answersOf = (question: QuestionEditorView) => {
  const content = contentFor(question, 'fr') ?? question.contents[0]
  return QUESTION_CHOICES.map((choice) => content?.answers.find((answer) => answer.choice === choice)?.text ?? '')
}

/** Motifs distincts de tous les signalements ouverts d'une question. */
const reasonsOf = (item: ReportedQuestion) => reasonsLabel(t, [...new Set(item.reports.flatMap((report) => report.reasons))] as QuestionReportReason[])

/**
 * Modération (`creation.md` § 1) : À valider et Signalements, balayables, onglets collés en haut. Approuver retire
 * la question de la file, Rejeter demande un motif, Modifier ouvre l'éditeur. Sans Équipe côté backend, la file À
 * valider contient les questions du créateur lui-même (toute question naît en attente).
 */
export function ModerationScreen() {
  const t = useT()
  const params = useLocalSearchParams<{ id: string; name?: string; tab?: string }>()
  const topicId = params.id
  const me = useMe(true)
  const workshop = useMyTopic(topicId)
  const questions = useTopicQuestions(topicId)
  const reports = useReportQueue(topicId, workshop.permissions?.canManage === true)
  const moderate = useModerateQuestion(topicId)
  const [tab, setTab] = useState<Tab>(params.tab === 'reports' ? 'reports' : 'pending')
  useEffect(() => {
    if (params.tab === 'reports') setTab('reports')
  }, [params.tab])
  const [rejecting, setRejecting] = useState<QuestionEditorView>()
  const rejectForm = useForm({ resolver: zodResolver(rejectQuestionSchema), mode: 'onChange', defaultValues: { reason: '' } })
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
  const author = (question: QuestionEditorView) => (question.creatorId === me.data?.userId ? (me.data?.pseudonym ?? t('mobile.authoring.me')) : t('workshop.roleWriter'))

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
          <EmptyState icon={CheckCircleIcon} title={t('workshop.nothingToValidate')} description={t('workshop.nothingToValidateText')} />
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
                  rejectForm.reset()
                  setRejecting(question)
                }}
                onEdit={() => openQuestionEditor(topicId, numberOf(question), question.questionId)}
              />
            ))}
            <FeedFooter {...feedFooterProps(pendingSource)} endLabel={t('workshop.validateEnd')} />
          </>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )

  const reportsPage = (
    <DragToLoadMore {...loadMoreOptions(reportSource)}>
      <TabLoadMoreScrollView contentContainerStyle={PAGE}>
        {reports.isPending ? (
          loading
        ) : reports.isError ? (
          <View>
            <Text>{t('mobile.authoring.reportsLoadFailed')}</Text>
            <Button onPress={() => void reports.refetch()}>{t('callback.retry')}</Button>
          </View>
        ) : reported.length === 0 ? (
          <EmptyState icon={CheckCircleIcon} title={t('workshop.noReport')} description={t('workshop.noReportText')} />
        ) : (
          <>
            <ListGroup surface="surface">
              {shownReports.map((item, index) => (
                <ListRow
                  key={item.question.questionId}
                  icon={item.question.status === 'SUSPENDED' ? ProhibitIcon : WarningIcon}
                  label={questionText(item.question)}
                  sub={(() => {
                    const rest = `${reasonsOf(item)} · ${reportsLabel(t, item.reports.length)}`
                    return item.question.status === 'SUSPENDED' ? t('workshop.suspendedPrefix', { rest }) : rest
                  })()}
                  control="chevron"
                  onPress={() =>
                    router.push({
                      pathname: '/workshop/[id]/reports/[questionId]',
                      params: { id: topicId, questionId: item.question.questionId, name: params.name ?? '' },
                    })
                  }
                  last={index === shownReports.length - 1}
                />
              ))}
            </ListGroup>
            <FeedFooter {...feedFooterProps(reportSource)} endLabel={t('workshop.reportsEnd')} />
          </>
        )}
      </TabLoadMoreScrollView>
    </DragToLoadMore>
  )

  if (workshop.isError || questions.isError)
    return (
      <Screen header={<MobileTopBar variant="inline" title={t('workshop.moderation')} back={t('pending.topic')} onBack={() => router.back()} />}>
        <Text>{t('mobile.authoring.moderationUnavailable')}</Text>
        <Button
          onPress={() => {
            void workshop.refetch()
            void questions.refetch()
          }}
        >
          {t('callback.retry')}
        </Button>
      </Screen>
    )
  if (workshop.isPending) return <Screen>{loading}</Screen>
  if (!workshop.permissions?.canManage)
    return (
      <Screen header={<MobileTopBar variant="inline" title={t('mobile.authoring.myProposals')} back={t('pending.topic')} onBack={() => router.back()} />}>
        {all.length === 0 && <Text>{t('mobile.authoring.noProposals')}</Text>}
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
      scroll={false}
      header={<MobileTopBar variant="inline" back={t('pending.topic')} onBack={() => router.back()} title={t('workshop.moderation')} />}
      overlay={
        <>
          <MobileSheet
            open={rejecting !== undefined}
            onClose={() => setRejecting(undefined)}
            title={t('workshop.rejectTitle')}
            footer={
              <Button
                full
                variant="tinted"
                tone="destructive"
                disabled={!rejectForm.formState.isValid}
                loading={moderate.isPending}
                onPress={() =>
                  void rejectForm.handleSubmit(({ reason }) => {
                    if (rejecting) moderate.mutate({ questionId: rejecting.questionId, decision: 'reject', reason }, { onSuccess: () => setRejecting(undefined) })
                  })()
                }
              >
                {t('workshop.reject')}
              </Button>
            }
          >
            <Controller
              control={rejectForm.control}
              name="reason"
              render={({ field }) => (
                <Field
                  label={t('workshop.rejectReason')}
                  placeholder={t('workshop.rejectPlaceholder')}
                  multiline
                  value={field.value}
                  maxLength={MAX_REJECT}
                  counter={t('mobile.authoring.counter', { count: field.value.length, max: MAX_REJECT })}
                  onChangeText={field.onChange}
                />
              )}
            />
          </MobileSheet>
        </>
      }
    >
      <View style={{ flex: 1 }}>
        <TabsScrollView<Tab>
          label={t('workshop.moderation')}
          value={tab}
          onChange={setTab}
          scrollToTopPill={false}
          pages={[
            { value: 'pending', label: t('workshop.toValidate', { count: pending.length }), content: pendingPage },
            { value: 'reports', label: t('workshop.reportsTab', { count: reported.length }), content: reportsPage },
          ]}
        />
      </View>
    </Screen>
  )
}
