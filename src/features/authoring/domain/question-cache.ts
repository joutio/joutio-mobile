import type { QuestionEditorView } from './authoring'
import type { QuestionOperation } from './question-draft'

/** Applies exactly the submitted fields; editing does not reset moderation in the domain. */
export function applyQuestionOperations(
  previous: QuestionEditorView | undefined,
  id: string,
  operations: readonly QuestionOperation[],
): QuestionEditorView | undefined {
  let question = previous
  for (const operation of operations) {
    if (operation.kind === 'create') {
      question = {
        questionId: id,
        ...operation.payload,
        status: 'PENDING',
        suspended: false,
        archived: false,
        openReportCount: 0,
        totalReportCount: 0,
        lastReportedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: null,
      }
    } else if (question) {
      if (operation.kind === 'imageUrl') question = { ...question, imageUrl: operation.imageUrl }
      else if (operation.kind === 'correctAnswer') question = { ...question, correctAnswer: operation.correctAnswer }
      else if (operation.kind === 'translation')
        question = {
          ...question,
          contents: [
            ...question.contents.filter((content) => content.language !== operation.language),
            { language: operation.language, text: operation.text, answers: operation.answers },
          ],
        }
      else
        question = {
          ...question,
          contents: question.contents.map((content) =>
            content.language !== operation.language
              ? content
              : operation.kind === 'text'
                ? { ...content, text: operation.text }
                : { ...content, answers: operation.answers },
          ),
        }
    }
  }
  return question
}
