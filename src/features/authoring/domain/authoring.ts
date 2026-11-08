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

/** Signalement vu par le propriétaire du sujet, sans identité du signalant (`OwnerQuestionReportView`). */
export interface OwnerQuestionReport {
  reportId: string
  reasons: QuestionReportReason[]
  comment: string | null
  language: Language | null
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
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
