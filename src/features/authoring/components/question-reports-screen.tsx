import PagerView, { type PagerViewRef } from '@expo/ui/community/pager-view'
import { useLocalSearchParams } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import {
  Button,
  CheckCircleIcon,
  ClockCounterClockwiseIcon,
  DetentSheet,
  EmptyState,
  FlagIcon,
  MobileTopBar,
  PencilSimpleIcon,
  Pill,
  ProhibitIcon,
  QuestionBlock,
  Screen,
  Segmented,
  showDialog,
  Skeleton,
  Text,
  tokens,
  useTheme,
  WarningCircleIcon,
  type AnswerCardProps,
  type Detent,
} from '@/design-system'
import { topicName } from '@/shared/utils/topic-name'
import {
  contentFor,
  QUESTION_CHOICES,
  reasonCounts,
  REPORT_REASON_LABEL,
  snapshotDiffers,
  type OwnerQuestionReport,
  type QuestionEditorView,
  type ReportedQuestion,
  type ReportSnapshot,
} from '@joutio/client-domain/authoring'
import { useDismissReports, useMyTopic, useReportQueue, useTopicQuestions } from '../hooks/use-authoring'
import { openQuestionEditor, questionNumber } from './questions-screen'

type Version = 'current' | 'reported'

export interface QuestionReportsRouteParams {
  id: string
  questionId: string
  /** Signalement mis en avant (ouverture depuis une notification). */
  highlight?: string
  /** `notifications` : le retour nomme la boîte de réception. */
  from?: string
  name?: string
  [key: string]: string | undefined
}

const DATE = new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short' })
const LANGUAGE_LABEL: Record<string, string> = { fr: 'Français', en: 'English' }

/** Contenu signalé à comparer : celui du signalement ciblé, sinon du plus récent qui diffère de la question actuelle. */
function reportedSnapshot(item: ReportedQuestion, highlight?: string): ReportSnapshot | undefined {
  const targeted = item.reports.find((report) => report.reportId === highlight)?.snapshot
  if (targeted && snapshotDiffers(item.question, targeted)) return targeted
  return item.reports.map((report) => report.snapshot).find((snapshot) => snapshotDiffers(item.question, snapshot)) ?? undefined
}

/** Réponses dans l'ordre A–D, la bonne marquée, sans interaction (`QuestionBlock` du duel). */
function cardsOf(answers: readonly { choice: string; text: string }[], correct: string | null): (AnswerCardProps & { key: string })[] {
  return QUESTION_CHOICES.map((choice) => ({
    key: choice,
    label: answers.find((answer) => answer.choice === choice)?.text ?? '',
    state: choice === correct ? 'correct' : 'rest',
  }))
}

/** Historique en une ligne, à la place d'une liste de signalements clos (« Déjà signalée 2 fois · corrigée le 28 oct. »). */
function historyLine(item: ReportedQuestion, open: boolean): string | undefined {
  const history = item.history
  if (!history) return undefined
  const outcome = history.lastStatus === 'RESOLVED' ? 'corrigée' : 'close sans modification'
  const when = history.lastReviewedAt ? ` le ${DATE.format(new Date(history.lastReviewedAt))}` : ''
  if (!open) return `${outcome.charAt(0).toUpperCase()}${outcome.slice(1)}${when}`
  return `Déjà signalée ${history.closedCount} fois · ${outcome}${when}`
}

const QuestionPage = memo(function QuestionPage({
  question,
  number,
  snapshot,
  peek,
}: {
  question: QuestionEditorView
  number: number
  snapshot: ReportSnapshot | undefined
  peek: number
}) {
  const { colors } = useTheme()
  const content = contentFor(question, 'fr') ?? question.contents[0]
  const text = snapshot?.questionText ?? content?.text ?? ''
  const cards = useMemo(
    () => (snapshot ? cardsOf(snapshot.answers, snapshot.correctAnswer) : cardsOf(content?.answers ?? [], question.correctAnswer)),
    [snapshot, content, question.correctAnswer],
  )
  return (
    <View style={{ flex: 1, gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2], paddingBottom: peek + tokens.space[3] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[2] }}>
        <Text variant="headline">{number > 0 ? `Question ${number}` : 'Question'}</Text>
        {question.status === 'SUSPENDED' ? (
          <Pill tone="suspended" icon={ProhibitIcon}>
            Suspendue
          </Pill>
        ) : question.status === 'APPROVED' ? (
          <Pill tone="correct" icon={CheckCircleIcon}>
            En jeu
          </Pill>
        ) : (
          <Pill tone="pending">Hors jeu</Pill>
        )}
      </View>
      <View style={{ flex: 1, minHeight: 0 }}>
        <QuestionBlock
          text={text}
          image={(snapshot ? snapshot.imageUrl : question.imageUrl) ?? undefined}
          layout="2x2"
          answers={cards}
          notchColor={colors.bg}
        />
      </View>
    </View>
  )
})

function ReportCard({ report, highlighted }: { report: OwnerQuestionReport; highlighted: boolean }) {
  const { colors, radius } = useTheme()
  return (
    <View
      accessibilityLabel={highlighted ? 'Signalement de la notification' : undefined}
      style={{
        gap: tokens.space[2],
        padding: tokens.space[4],
        borderRadius: radius.lg,
        backgroundColor: colors.raised,
        borderWidth: highlighted ? 2 : 0,
        borderColor: colors.accent,
      }}
    >
      {highlighted && (
        <Text variant="caption" weight="600" color="accentInk">
          Signalement de la notification
        </Text>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[1] }}>
        {report.reasons.map((reason) => (
          <Pill key={reason} tone="wrong">
            {REPORT_REASON_LABEL[reason]}
          </Pill>
        ))}
      </View>
      {report.comment ? <Text>{`« ${report.comment} »`}</Text> : <Text color="muted">Aucun commentaire.</Text>}
      <Text variant="caption" color="muted">
        {`${report.language ? `${LANGUAGE_LABEL[report.language] ?? report.language} · ` : ''}${DATE.format(new Date(report.createdAt))}`}
      </Text>
    </View>
  )
}

/**
 * Signalements d'un sujet, en file de tri (`creation.md`, Signalements d'une question) : la question en plein écran,
 * telle que les joueurs la voient (Actuelle / Signalée), et ses signalements anonymes dans une `DetentSheet`. On
 * balaie entre les questions ; après « Clore », la suivante arrive. Écran de tâche, hors onglets ; le retour revient
 * à l'écran d'origine (Modération ou Notifications).
 */
export function QuestionReportsScreen() {
  const params = useLocalSearchParams<QuestionReportsRouteParams>()
  const { colors } = useTheme()
  const topicId = params.id
  const workshop = useMyTopic(topicId)
  const queue = useReportQueue(topicId)
  const questions = useTopicQuestions(topicId)
  const dismiss = useDismissReports(topicId)
  const pager = useRef<PagerViewRef>(null)
  const [current, setCurrent] = useState(params.questionId)
  const [detent, setDetent] = useState<Detent>(params.highlight ? 'half' : 'peek')
  const [version, setVersion] = useState<Version>('current')
  const [peek, setPeek] = useState(200)
  // Dernière position connue : une question traitée sort de la file, la suivante prend sa place.
  const lastIndex = useRef(0)

  const items = useMemo(() => queue.data ?? [], [queue.data])
  const found = items.findIndex((item) => item.question.questionId === current)
  const index = found >= 0 ? found : Math.min(lastIndex.current, Math.max(0, items.length - 1))
  if (found >= 0) lastIndex.current = found
  const item = items[index]
  const name = workshop.topic ? topicName(workshop.topic.names) : (params.name ?? '')
  const back = params.from === 'notifications' ? 'Notifications' : 'Modération'
  const position = items.length > 1 ? ` · ${index + 1} / ${items.length}` : ''

  // La question affichée suit la file : après une clôture, elle reprend la suivante.
  useEffect(() => {
    if (item && item.question.questionId !== current) setCurrent(item.question.questionId)
  }, [item, current])

  const select = (next: number) => {
    const target = items[next]
    if (!target || target.question.questionId === current) return
    setCurrent(target.question.questionId)
    setVersion('current')
    setDetent('peek')
  }

  const header = <MobileTopBar variant="inline" back={back} onBack={() => router.back()} title="Signalements" subtitle={`${name}${position}`} />

  if (queue.isPending || workshop.isPending)
    return (
      <Screen header={header} contentStyle={{ gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[2] }}>
        <Skeleton shape="card" />
        <Skeleton shape="row" />
        <Skeleton shape="row" />
      </Screen>
    )
  if (queue.isError || workshop.isError || !workshop.permissions?.canManage)
    return (
      <Screen header={header}>
        <EmptyState
          icon={WarningCircleIcon}
          title="Signalements indisponibles"
          description="Vérifie ta connexion, ou ton rôle dans l'équipe du sujet."
          action={
            <Button
              style={{ alignSelf: 'center' }}
              onPress={() => {
                void queue.refetch()
                void workshop.refetch()
              }}
            >
              Réessayer
            </Button>
          }
        />
      </Screen>
    )
  if (!item)
    return (
      <Screen header={header}>
        <EmptyState
          icon={CheckCircleIcon}
          title="Tout est traité"
          description="Aucun signalement n'attend de réponse sur ce sujet."
          action={
            <Button style={{ alignSelf: 'center' }} onPress={() => router.back()}>
              Retour
            </Button>
          }
        />
      </Screen>
    )

  const open = item.reports
  const counts = reasonCounts(open)
  const history = historyLine(item, open.length > 0)
  const snapshot = reportedSnapshot(item, params.highlight)
  const number = questions.data ? questionNumber(questions.data, item.question.questionId) : 0

  return (
    <Screen
      scroll={false}
      header={
        <>
          {header}
          {snapshot && (
            <View style={{ paddingHorizontal: tokens.space[5], paddingTop: tokens.space[1], paddingBottom: tokens.space[2] }}>
              <Segmented<Version>
                label="Version de la question"
                value={version}
                onChange={setVersion}
                options={[
                  { value: 'current', label: 'Actuelle' },
                  { value: 'reported', label: 'Signalée' },
                ]}
              />
            </View>
          )}
        </>
      }
      contentStyle={{ paddingBottom: 0 }}
    >
      <View style={{ flex: 1 }}>
        <PagerView
          // La file change (question traitée) : le pager repart sur la question courante.
          key={items.map((entry) => entry.question.questionId).join('|')}
          ref={pager}
          style={{ flex: 1 }}
          initialPage={index}
          onPageSelected={(event) => select(event.nativeEvent.position)}
        >
          {items.map((entry) => (
            <View key={entry.question.questionId} style={{ flex: 1 }}>
              <QuestionPage
                question={entry.question}
                number={questions.data ? questionNumber(questions.data, entry.question.questionId) : 0}
                snapshot={entry === item && version === 'reported' ? snapshot : undefined}
                peek={peek}
              />
            </View>
          ))}
        </PagerView>
        <DetentSheet
          label="Signalements de la question"
          detent={detent}
          onDetentChange={setDetent}
          onPeekHeight={setPeek}
          locked={open.length === 0}
          header={
            <View style={{ gap: tokens.space[2] }}>
              <Text variant="headline">
                {open.length > 0 ? `${open.length} signalement${open.length > 1 ? 's' : ''} ouvert${open.length > 1 ? 's' : ''}` : 'Signalements traités'}
              </Text>
              {history && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] }}>
                  <ClockCounterClockwiseIcon size={14} color={colors.muted} />
                  <Text variant="caption" color="muted">
                    {history}
                  </Text>
                </View>
              )}
              {counts.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[1] }}>
                  {counts.map(([reason, count]) => (
                    <Pill key={reason} tone="wrong">
                      {`${REPORT_REASON_LABEL[reason]} · ${count}`}
                    </Pill>
                  ))}
                </View>
              )}
            </View>
          }
          footer={
            open.length > 0 ? (
              <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
                <Button
                  style={{ flex: 1 }}
                  full
                  variant="gray"
                  tone="neutral"
                  onPress={() =>
                    showDialog({
                      title: open.length > 1 ? `Clore les ${open.length} signalements ?` : 'Clore le signalement ?',
                      message: 'La question reste telle quelle et les joueurs ne sont pas prévenus. Une question suspendue reste à approuver.',
                      icon: CheckCircleIcon,
                      actions: [
                        { label: 'Clore sans modifier', onPress: () => dismiss.mutate(item.question.questionId) },
                        { label: 'Annuler', variant: 'plain' },
                      ],
                    })
                  }
                >
                  Clore
                </Button>
                <Button style={{ flex: 1 }} full icon={PencilSimpleIcon} onPress={() => openQuestionEditor(topicId, number, item.question.questionId, true)}>
                  Modifier
                </Button>
              </View>
            ) : undefined
          }
        >
          {open.map((report) => (
            <ReportCard key={report.reportId} report={report} highlighted={report.reportId === params.highlight} />
          ))}
          {params.from === 'notifications' && (
            <Button
              variant="plain"
              icon={FlagIcon}
              onPress={() => router.push({ pathname: '/workshop/[id]/moderation', params: { id: topicId, tab: 'reports' } })}
            >
              Tous les signalements du sujet
            </Button>
          )}
        </DetentSheet>
      </View>
    </Screen>
  )
}
