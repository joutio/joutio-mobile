import type { QuestionReportReason } from '@joutio/client/api-types'
import type { QuestionStatus, TranslationStatus } from '@joutio/client/authoring'
import type { MessageKey } from '@joutio/client/i18n'

/**
 * Codes du domaine → clés de texte. Les libellés français de `@joutio/client/authoring` (`REPORT_REASON_LABEL`,
 * `QUESTION_STATUS_LABEL`…) restent pour les tests ; l'interface passe toujours par ces clés, comme le web.
 */
export const REASON_LABEL: Record<QuestionReportReason, MessageKey> = {
  QUESTION: 'workshop.reasonQuestion',
  IMAGE: 'workshop.reasonImage',
  ANSWERS: 'workshop.reasonAnswers',
  COPYRIGHT: 'workshop.reasonCopyright',
}

export const STATUS_LABEL: Record<QuestionStatus, MessageKey> = {
  approved: 'workshop.statusApproved',
  pending: 'workshop.statusPending',
  rejected: 'workshop.statusRejected',
  suspended: 'workshop.statusSuspended',
  archived: 'workshop.statusArchived',
}

/** Statut de la traduction anglaise, en minuscules dans la phrase « Anglais : … ». */
export const TRANSLATION_LABEL: Record<TranslationStatus, MessageKey> = {
  none: 'workshop.englishNone',
  partial: 'workshop.englishPartialLower',
  complete: 'workshop.englishComplete',
}

/** Langues de saisie : leur nom dans leur propre langue, jamais traduit. */
export const LANGUAGE_NAME = { fr: 'Français', en: 'English' } as Record<string, string> & Record<'fr' | 'en', string>

type T = (key: MessageKey, values?: Record<string, string | number>) => string

/** « 1 question », « 12 questions ». */
export const questionsLabel = (t: T, count: number) => t(count > 1 ? 'workshop.questionsMany' : 'workshop.questionsOne', { count })

/** « 1 signalement », « 3 signalements ». */
export const reportsLabel = (t: T, count: number) => t(count > 1 ? 'workshop.reportsMany' : 'workshop.reportsOne', { count })

/** « L'énoncé, Les réponses ». */
export const reasonsLabel = (t: T, reasons: readonly QuestionReportReason[]) => reasons.map((reason) => t(REASON_LABEL[reason])).join(', ')
