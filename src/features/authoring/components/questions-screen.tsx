import { router, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import {
  ArchiveIcon,
  ArrowsDownUpIcon,
  Notice,
  Button,
  Chip,
  CheckCircleIcon,
  EmptyState,
  FeedFooter,
  HourglassMediumIcon,
  IconButton,
  ListChecksIcon,
  ListGroup,
  ListRow,
  MagnifyingGlassIcon,
  MobileSheet,
  MobileTopBar,
  PlusIcon,
  ProgressBar,
  ProhibitIcon,
  RadioGroup,
  Screen,
  SearchHeader,
  SectionHeader,
  Skeleton,
  Text,
  tokens,
  useTheme,
  WarningCircleIcon,
  XCircleIcon,
  type Icon,
} from '@/design-system'
import {
  isTranslated,
  QUESTION_SORTS,
  QUESTION_STATUS_LABEL,
  questionStatus,
  questionText,
  sortQuestions,
  type QuestionEditorView,
  type QuestionSort,
  type QuestionStatus,
} from '@joutio/client-domain/authoring'
import { MIN_QUESTIONS, questionsLabel } from '@joutio/client-domain/authoring'
import { useCreationLimits, useMyTopic, useTopicQuestions } from '../hooks/use-authoring'
import { clientSource, feedFooterProps, loadMoreOptions } from '@/shared/utils/paging'

const GUTTER = tokens.space[5]
const PAGE_SIZE = 10

type StatusFilter = 'all' | QuestionStatus
type TranslationFilter = 'all' | 'translated' | 'untranslated'

/** « Tous les statuts » laisse de côté les archivées : on les retrouve par leur filtre. */
const STATUS_FILTERS: readonly { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'approved', label: QUESTION_STATUS_LABEL.approved },
  { value: 'pending', label: QUESTION_STATUS_LABEL.pending },
  { value: 'rejected', label: QUESTION_STATUS_LABEL.rejected },
  { value: 'suspended', label: QUESTION_STATUS_LABEL.suspended },
  { value: 'archived', label: QUESTION_STATUS_LABEL.archived },
]

/** Sous-ligne : statut, signalements ouverts, traduction. */
const questionSub = (question: QuestionEditorView) => {
  const status = QUESTION_STATUS_LABEL[questionStatus(question)]
  const reports = question.openReportCount > 0 ? ` · ${question.openReportCount} signalement${question.openReportCount > 1 ? 's' : ''}` : ''
  return `${status}${reports} · ${isTranslated(question) ? 'traduite' : 'sans anglais'}`
}
const TRANSLATION_FILTERS: readonly { value: TranslationFilter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'translated', label: 'Traduites' },
  { value: 'untranslated', label: 'Sans anglais' },
]

/** Statut à gauche de la ligne, en icône pleine ; le sous-titre le dit aussi en toutes lettres. */
const STATUS_ICON: Record<QuestionStatus, { icon: Icon; color: 'correct' | 'accentInk' | 'wrong' | 'muted' }> = {
  archived: { icon: ArchiveIcon, color: 'muted' },
  approved: { icon: CheckCircleIcon, color: 'correct' },
  pending: { icon: HourglassMediumIcon, color: 'accentInk' },
  suspended: { icon: ProhibitIcon, color: 'wrong' },
  rejected: { icon: XCircleIcon, color: 'wrong' },
}

function StatusIcon({ status }: { status: QuestionStatus }) {
  const { colors } = useTheme()
  const { icon: StatusGlyph, color } = STATUS_ICON[status]
  return <StatusGlyph size={20} weight="fill" color={colors[color]} />
}

export interface QuestionsRouteParams {
  id: string
  name?: string
  [key: string]: string | undefined
}

/** Ouvre l'éditeur de question en modale (création sans `questionId`). */
export function openQuestionEditor(topicId: string, number: number, questionId?: string, resolveReports = false) {
  router.push({
    pathname: '/question-editor',
    params: { topicId, number: String(number), questionId: questionId ?? '', resolveReports: resolveReports ? '1' : '' },
  })
}

/** Numéro d'une question dans son sujet : son rang de création (1 pour la plus ancienne). */
export function questionNumber(questions: readonly QuestionEditorView[], questionId: string) {
  return [...questions].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).findIndex((question) => question.questionId === questionId) + 1
}

function FilterOptions<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View style={{ gap: tokens.space[4] }}>
      <SectionHeader title={label} />
      <RadioGroup label={label}>
        <ListGroup>
          {options.map((option, index) => (
            <ListRow
              key={option.value}
              label={option.label}
              control="radio"
              on={value === option.value}
              onToggle={() => onChange(option.value)}
              last={index === options.length - 1}
            />
          ))}
        </ListGroup>
      </RadioGroup>
    </View>
  )
}

/**
 * Questions (`creation.md` § 1) : même page en brouillon et publié. Recherche et filtres dans l'en-tête fixe, comme
 * Tous les titres ; repère du plafond une fois publié. 10 par page.
 */
export function QuestionsScreen() {
  const params = useLocalSearchParams<QuestionsRouteParams>()
  const topicId = params.id
  const { topic } = useMyTopic(topicId)
  const questions = useTopicQuestions(topicId)
  const { premium, limits, askPremium } = useCreationLimits()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [translation, setTranslation] = useState<TranslationFilter>('all')
  const [sort, setSort] = useState<QuestionSort>(QUESTION_SORTS[0])
  const [filterOpen, setFilterOpen] = useState(false)
  const [pages, setPages] = useState(1)

  const all = useMemo(() => questions.data ?? [], [questions.data])
  const draft = (topic?.status ?? 'DRAFT') === 'DRAFT'
  const count = all.length
  const approved = all.filter((question) => questionStatus(question) === 'approved').length
  const atCeiling = premium && count >= limits.questions
  const search = query.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      sortQuestions(
        all.filter(
          (question) =>
            (search === '' || questionText(question).toLowerCase().includes(search)) &&
            (status === 'all' ? questionStatus(question) !== 'archived' : questionStatus(question) === status) &&
            (translation === 'all' || isTranslated(question) === (translation === 'translated')),
        ),
        sort,
      ),
    [all, search, status, translation, sort],
  )
  const sorts = QUESTION_SORTS.filter((option) => !draft || option !== 'Plus signalées')
  // Numéro d'une question : son rang de création, stable quels que soient le tri et les filtres.
  const byCreation = useMemo(() => [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [all])
  const shown = filtered.slice(0, pages * PAGE_SIZE)
  const source = clientSource(pages, setPages, shown.length < filtered.length)
  const filterActive = status !== 'all' || translation !== 'all'
  // Retour à la première page à chaque recherche ou filtre.
  const change = (next: () => void) => {
    next()
    setPages(1)
  }
  const reset = () =>
    change(() => {
      setStatus('all')
      setTranslation('all')
      setSort(QUESTION_SORTS[0])
    })

  const add = () => {
    if (!premium && count >= limits.questions) return askPremium('questions')
    openQuestionEditor(topicId, count + 1)
  }

  const header = (
    <SearchHeader
      title="Questions"
      titleBar={
        <MobileTopBar
          variant="inline"
          back="Sujet"
          onBack={() => router.back()}
          title="Questions"
          right={<IconButton icon={PlusIcon} label="Ajouter une question" variant="plain" tone="accent" disabled={atCeiling} onPress={add} />}
        />
      }
      searchVisible={count > 0}
      value={query}
      onChange={(next) => change(() => setQuery(next))}
      placeholder="Chercher une question"
      filterLabel="Trier et filtrer les questions"
      filterDot={filterActive}
      onFilter={() => setFilterOpen(true)}
    />
  )

  const empty = () => {
    if (questions.isPending)
      return (
        <View style={{ gap: tokens.space[3] }}>
          <Skeleton shape="row" />
          <Skeleton shape="row" />
          <Skeleton shape="row" />
        </View>
      )
    if (questions.isError)
      return (
        <EmptyState
          icon={WarningCircleIcon}
          title="Impossible de charger les questions"
          description="Vérifie ta connexion, puis réessaie."
          action={
            <Button style={{ alignSelf: 'center' }} loading={questions.isRefetching} onPress={() => void questions.refetch()}>
              Réessayer
            </Button>
          }
        />
      )
    if (count === 0)
      return (
        <EmptyState
          icon={ListChecksIcon}
          title="Aucune question"
          description={`Rédige au moins ${MIN_QUESTIONS} questions pour publier le sujet.`}
          action={
            <Button full icon={PlusIcon} onPress={add}>
              Ajouter une question
            </Button>
          }
        />
      )
    return (
      <EmptyState
        icon={MagnifyingGlassIcon}
        title="Aucune question trouvée"
        description="Vérifie le texte cherché, ou retire des filtres."
        action={
          <Button
            full
            onPress={() => {
              setQuery('')
              reset()
            }}
          >
            Tout afficher
          </Button>
        }
      />
    )
  }

  return (
    <Screen
      header={header}
      loadMore={loadMoreOptions(source)}
      onRefresh={() => questions.refetch()}
      contentStyle={{ gap: tokens.space[3], paddingHorizontal: GUTTER, paddingTop: tokens.space[1], paddingBottom: tokens.space[7] }}
      overlay={
        <MobileSheet
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          title="Trier et filtrer"
          action={
            <Button variant="plain" size="S" onPress={reset}>
              Réinitialiser
            </Button>
          }
          footer={
            <Button full onPress={() => setFilterOpen(false)}>
              {`Afficher ${questionsLabel(filtered.length)}`}
            </Button>
          }
        >
          <View style={{ gap: tokens.space[6] }}>
            <FilterOptions
              label="Trier par"
              options={sorts.map((option) => ({ value: option, label: option }))}
              value={sort}
              onChange={(next) => change(() => setSort(next))}
            />
            <FilterOptions label="Statut" options={STATUS_FILTERS} value={status} onChange={(next) => change(() => setStatus(next))} />
            <FilterOptions label="Traduction" options={TRANSLATION_FILTERS} value={translation} onChange={(next) => change(() => setTranslation(next))} />
          </View>
        </MobileSheet>
      }
    >
      {questions.data ? (
        <View style={{ gap: tokens.space[3] }}>
          {/* Brouillon : l'avancement vers la publication est sur Mon sujet. */}
          {!draft && <ProgressBar label={`${count} / ${limits.questions} questions`} value={Math.min(100, (count * 100) / limits.questions)} />}
          {atCeiling && (
            <Notice tone="info" title="Sujet complet" message={`${limits.questions} questions au maximum. Retire une question pour en ajouter une autre.`} />
          )}
        </View>
      ) : null}
      {shown.length === 0 ? (
        empty()
      ) : (
        <>
          {/* Total et tri courant toujours visibles, comme Sujets ; la puce ouvre la feuille. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[3] }}>
            <Text variant="callout" color="muted">
              {questionsLabel(filtered.length)}
            </Text>
            <Chip icon={ArrowsDownUpIcon} onPress={() => setFilterOpen(true)}>
              {sort}
            </Chip>
          </View>
          <ListGroup surface="surface">
            {shown.map((item, index) => {
              const itemStatus = questionStatus(item)
              return (
                <ListRow
                  key={item.questionId}
                  leading={<StatusIcon status={itemStatus} />}
                  label={questionText(item)}
                  sub={questionSub(item)}
                  control="chevron"
                  onPress={() => openQuestionEditor(topicId, byCreation.indexOf(item) + 1, item.questionId)}
                  last={index === shown.length - 1}
                />
              )
            })}
          </ListGroup>
          <FeedFooter {...feedFooterProps(source)} endLabel="Tu as vu toutes les questions" />
        </>
      )}
    </Screen>
  )
}
