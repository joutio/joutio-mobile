import type { Language } from '@/shared/types/bff'

/** Choix de réponse d'une question (enum backend `QuestionChoice`). */
export type QuestionChoice = 'A' | 'B' | 'C' | 'D'
export const QUESTION_CHOICES: readonly QuestionChoice[] = ['A', 'B', 'C', 'D']

/** Statut de modération (enum backend `QuestionStatus`). */
export type QuestionModeration = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ARCHIVED'

/** Motif d'un signalement (enum backend `QuestionReportReason`). */
export type QuestionReportReason = 'QUESTION' | 'IMAGE' | 'ANSWERS'

export interface QuestionAnswer {
  choice: QuestionChoice
  text: string
}

/** Contenu localisé (`QuestionEditorView.ContentView`). */
export interface QuestionContent {
  language: Language
  text: string
  answers: QuestionAnswer[]
}

/** Question vue par l'auteur du sujet (`QuestionEditorView`), champs lus par l'app. */
export interface QuestionEditorView {
  questionId: string
  creatorId?: string
  rejectionReason?: string | null
  contents: QuestionContent[]
  correctAnswer: QuestionChoice
  imageUrl: string | null
  status: QuestionModeration
  suspended: boolean
  archived: boolean
  openReportCount: number
  totalReportCount: number
  lastReportedAt: string | null
  createdAt: string
  updatedAt: string | null
}

/** Contenu figé de la question au moment du signalement (`QuestionReportSnapshotView`). */
export interface ReportSnapshot {
  questionText: string | null
  imageUrl: string | null
  answers: QuestionAnswer[]
  correctAnswer: QuestionChoice | null
  language: string | null
}

export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED'

/** Signalement vu par le propriétaire du sujet, sans identité du signalant (`OwnerQuestionReportView`). */
export interface OwnerQuestionReport {
  reportId: string
  reasons: QuestionReportReason[]
  comment: string | null
  language: Language | null
  snapshot?: ReportSnapshot | null
  status: ReportStatus
  createdAt: string
}

/**
 * Une question de la file des signalements d'un sujet (`ReportedQuestionView`) : question actuelle, signalements
 * ouverts (du plus récent au plus ancien) et historique résumé des clos.
 */
export interface ReportedQuestion {
  question: QuestionEditorView
  reports: OwnerQuestionReport[]
  history: { closedCount: number; lastStatus: ReportStatus; lastReviewedAt: string | null } | null
}

/** Actions en attente sur un sujet géré (`TopicTodoView`, Mes sujets › À traiter). */
export interface TopicTodo {
  topicId: string
  pending: number
  reportedQuestions: number
  suspended: number
}

export const todoTotal = (todo: TopicTodo | undefined) => (todo ? todo.pending + todo.reportedQuestions : 0)

/** Le contenu signalé diffère de la question actuelle (texte, réponses ou bonne réponse, dans la langue du signalement). */
export function snapshotDiffers(question: QuestionEditorView, snapshot: ReportSnapshot | null | undefined): boolean {
  if (!snapshot?.questionText) return false
  const content = contentFor(question, (snapshot.language as Language | null) ?? 'fr') ?? contentFor(question, 'fr')
  if (!content) return true
  if (content.text !== snapshot.questionText || snapshot.correctAnswer !== question.correctAnswer) return true
  return QUESTION_CHOICES.some(
    (choice) => content.answers.find((answer) => answer.choice === choice)?.text !== snapshot.answers.find((answer) => answer.choice === choice)?.text,
  )
}

/** Motifs des signalements ouverts, du plus cité au moins cité. */
export function reasonCounts(reports: readonly OwnerQuestionReport[]): [QuestionReportReason, number][] {
  const counts = new Map<QuestionReportReason, number>()
  for (const report of reports) for (const reason of report.reasons) counts.set(reason, (counts.get(reason) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1])
}

/** Rôle du joueur sur le sujet, pour les actions (`creation.md`, Tri, actions et rôles). */
export type WorkshopRole = 'creator' | 'admin' | 'writer'

export const workshopRole = (permissions: TopicPermissions | undefined): WorkshopRole =>
  permissions?.role === 'CREATOR' ? 'creator' : permissions?.canManage ? 'admin' : 'writer'

export type QuestionAction = 'archive' | 'restore' | 'delete'

/**
 * Qui fait quoi sur une question : le créateur et les administrateurs archivent, restaurent et suppriment toute
 * question ; un rédacteur archive ou supprime **ses** questions en attente ou rejetées, rien d'autre.
 */
export function questionActions(role: WorkshopRole, question: Pick<QuestionEditorView, 'status' | 'creatorId'>, userId: string | undefined): QuestionAction[] {
  if (question.status === 'ARCHIVED') return role === 'writer' ? [] : ['restore', 'delete']
  if (role !== 'writer') return ['archive', 'delete']
  const mine = question.creatorId !== undefined && question.creatorId === userId
  return mine && (question.status === 'PENDING' || question.status === 'REJECTED') ? ['archive', 'delete'] : []
}

export interface CreateQuestionInput {
  contents: QuestionContent[]
  correctAnswer: QuestionChoice
  imageUrl: string | null
}

/** Statut affiché d'une question (`creation.md` § 1, Questions). */
export type QuestionStatus = 'approved' | 'pending' | 'suspended' | 'rejected' | 'archived'

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  archived: 'Archivée',
  approved: 'Approuvée',
  pending: 'En attente de validation',
  suspended: 'Suspendue après signalements',
  rejected: 'Rejetée',
}

export function questionStatus(question: QuestionEditorView): QuestionStatus {
  if (question.status === 'ARCHIVED') return 'archived'
  if (question.status === 'SUSPENDED') return 'suspended'
  if (question.status === 'APPROVED') return 'approved'
  if (question.status === 'REJECTED') return 'rejected'
  return 'pending'
}

export function contentFor(question: QuestionEditorView, language: Language): QuestionContent | undefined {
  return question.contents.find((content) => content.language === language)
}

/** Une traduction anglaise complète existe. */
export const isTranslated = (question: QuestionEditorView) => contentFor(question, 'en') !== undefined

/** Texte d'une question dans la langue demandée, avec repli sur le français. */
export const questionText = (question: QuestionEditorView, language: Language = 'fr') =>
  (contentFor(question, language) ?? contentFor(question, 'fr') ?? question.contents[0])?.text ?? ''

export const REPORT_REASON_LABEL: Record<QuestionReportReason, string> = {
  QUESTION: "L'énoncé",
  IMAGE: "L'image",
  ANSWERS: 'Les réponses',
}

/** « L'énoncé, Les réponses ». */
export const reasonsLabel = (reasons: readonly QuestionReportReason[]) => reasons.map((reason) => REPORT_REASON_LABEL[reason]).join(', ')

export type TeamRole = 'CREATOR' | 'ADMIN' | 'WRITER'
export interface TopicPermissions {
  role: TeamRole | null
  canContribute: boolean
  canManage: boolean
  canManageTeam: boolean
  canAddMembers: boolean
}
export interface TeamMember {
  userId: string
  pseudonym: string
  avatarOptions: string | null
  role: TeamRole
  premium: boolean
}
export interface TopicWorkshop {
  topic: import('@/shared/types/bff').TopicCardView
  permissions: TopicPermissions
}
export interface ReportDetail {
  topicId: string
  questionId: string
  report: OwnerQuestionReport
}

/** Tris de la liste Questions (`creation.md`). « Plus signalées » n'existe qu'une fois le sujet publié. */
export const QUESTION_SORTS = ['Plus récentes', 'Plus signalées', 'Plus anciennes', 'Ordre alphabétique'] as const
export type QuestionSort = (typeof QUESTION_SORTS)[number]

export function sortQuestions(questions: readonly QuestionEditorView[], sort: QuestionSort): QuestionEditorView[] {
  const recent = [...questions].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (sort === 'Plus anciennes') return recent.reverse()
  if (sort === 'Plus signalées') return recent.sort((a, b) => b.openReportCount - a.openReportCount)
  if (sort === 'Ordre alphabétique') return [...questions].sort((a, b) => questionText(a).localeCompare(questionText(b), 'fr'))
  return recent
}
