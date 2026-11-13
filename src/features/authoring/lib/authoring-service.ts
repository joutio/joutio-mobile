import { api } from '@/lib/api'
import { ENDPOINTS } from '@/lib/endpoints'
import type { IdResponse, Language, PageResponse, TopicCardView } from '@joutio/client-domain/api-types'
import type { CategoryCode } from '@/design-system'
import type {
  TopicTitles,
  TopicWorkshop,
  TeamMember,
  TeamRole,
  ReportDetail,
  OwnerQuestionReport,
  QuestionEditorView,
  ReportedQuestion,
  TopicTodo,
} from '@joutio/client-domain/authoring'
import type { QuestionOperation } from '@joutio/client-domain/authoring'

/** Taille de page de `GET /api/topics/{id}/questions` (plafond BFF : 100). */
const QUESTIONS_PAGE = 100

/** Écritures d'auteur (`creation.md` § 5) : sujets champ par champ, questions et modération. */
export const authoringService = {
  workshop: (id: string) => api.get<TopicWorkshop>(`/api/topics/${id}/workshop`),
  team: (id: string) => api.get<TeamMember[]>(`/api/topics/${id}/team`),
  setMember: (id: string, userId: string, role: TeamRole) => api.put<TeamMember>(`/api/topics/${id}/team/${userId}`, { role }),
  removeMember: (id: string, userId: string) => api.delete<void>(`/api/topics/${id}/team/${userId}`),
  draft: (id: string) => api.post<void>(`/api/topics/${id}/draft`),
  /** Supprime un brouillon (créateur seul) ; ses questions partent avec lui. */
  deleteTopic: (id: string) => api.delete<void>(`/api/topics/${id}`),
  /** File des signalements ouverts du sujet, une entrée par question. */
  reportQueue: (topicId: string) => api.get<ReportedQuestion[]>(`/api/question-reports/topics/${topicId}`),
  /** Mes sujets › À traiter. */
  todo: () => api.get<TopicTodo[]>('/api/topics/contributed/todo'),
  deleteQuestion: (id: string) => api.delete<void>(`/api/questions/${id}`),
  archive: (id: string) => api.post<void>(`/api/questions/${id}/archive`),
  restore: (id: string) => api.post<void>(`/api/questions/${id}/restore`),
  reportDetail: (id: string) => api.get<ReportDetail>(`/api/question-reports/${id}`),
  /** Mes sujets, brouillons et publiés, dont ceux où je suis dans l'équipe. */
  myTopics: () => api.get<PageResponse<TopicCardView>>('/api/topics/contributed', { params: { page: 0, size: 100 } }),
  /** Sujets dont je suis le créateur (`mine=true`, exclusif des autres filtres) : seuls comptent dans le plafond. */
  createdTopics: () => api.get<PageResponse<TopicCardView>>(ENDPOINTS.topics.list, { params: { mine: true, page: 0, size: 100 } }),

  createTopic: (name: string, category: CategoryCode) => api.post<IdResponse>(ENDPOINTS.topics.list, { names: { fr: name }, category }),

  updateName: (topicId: string, language: Language, name: string) => api.put<void>(ENDPOINTS.topics.name(topicId), { language, name }),

  updateCategory: (topicId: string, category: CategoryCode) => api.put<void>(ENDPOINTS.topics.category(topicId), { category }),

  updateImageUrl: (topicId: string, imageUrl: string | null) => api.put<void>(ENDPOINTS.topics.imageUrl(topicId), { imageUrl }),

  updatePictogramUrl: (topicId: string, pictogramUrl: string | null) => api.put<void>(ENDPOINTS.topics.pictogramUrl(topicId), { pictogramUrl }),
  /** Description du sujet, affichée sous le titre de la fiche ; `null` l'efface. */
  updateDescription: (topicId: string, description: string | null, language: 'fr' | 'en') =>
    api.put<void>(ENDPOINTS.topics.description(topicId), { description, language: language.toUpperCase() }),

  /** Titres par palier (`PUT /api/topics/{id}/titles`) ; `null` efface tout (repli « Or · Sujet »). */
  updateTitles: (topicId: string, titles: TopicTitles | null) => api.put<void>(ENDPOINTS.topics.titles(topicId), { titles }),

  publish: (topicId: string) => api.post<void>(ENDPOINTS.topics.publish(topicId)),

  /** Toutes les questions du sujet (150 au plus) : recherche et filtres se font dans l'app, le BFF n'en a pas. */
  async questions(topicId: string): Promise<QuestionEditorView[]> {
    const all: QuestionEditorView[] = []
    for (let page = 0; ; page += 1) {
      const result = await api.get<PageResponse<QuestionEditorView>>(ENDPOINTS.topics.questions(topicId), { params: { page, size: QUESTIONS_PAGE } })
      all.push(...result.content)
      if (result.last || result.content.length === 0) return all
    }
  },

  /** Envoie les opérations dans l'ordre ; renvoie l'identifiant de la question (créée ou modifiée). */
  async saveQuestion(topicId: string, questionId: string | undefined, operations: readonly QuestionOperation[]): Promise<string> {
    let id = questionId
    const completed: QuestionOperation[] = []
    try {
      for (const operation of operations) {
        switch (operation.kind) {
          case 'create':
            id = (await api.post<IdResponse>(ENDPOINTS.topics.questions(topicId), operation.payload)).id
            break
          case 'translation':
            await api.post<void>(ENDPOINTS.questions.translations(id ?? ''), { language: operation.language, text: operation.text, answers: operation.answers })
            break
          case 'text':
            await api.put<void>(ENDPOINTS.questions.text(id ?? ''), { language: operation.language, text: operation.text })
            break
          case 'answers':
            await api.put<void>(ENDPOINTS.questions.answers(id ?? ''), { language: operation.language, answers: operation.answers })
            break
          case 'correctAnswer':
            await api.put<void>(ENDPOINTS.questions.correctAnswer(id ?? ''), { correctAnswer: operation.correctAnswer })
            break
          case 'imageUrl':
            await api.put<void>(ENDPOINTS.questions.imageUrl(id ?? ''), { imageUrl: operation.imageUrl })
            break
        }
        completed.push(operation)
      }
      if (questionId && operations.length > 0) await api.post<void>(`/api/questions/${questionId}/resubmit`)
    } catch (cause) {
      throw Object.assign(new Error('partial question save', { cause }), { questionId: id, completedOperations: completed })
    }
    return id ?? ''
  },

  approve: (questionId: string) => api.post<void>(ENDPOINTS.questions.approve(questionId)),

  reject: (questionId: string, reason: string) => api.post<void>(ENDPOINTS.questions.reject(questionId), { reason }),

  reports: (questionId: string) => api.get<OwnerQuestionReport[]>(ENDPOINTS.questions.reports(questionId)),

  /** Clôt tous les signalements ouverts d'une question : `RESOLVED` après modification, `DISMISSED` sinon. */
  resolveReports: (questionId: string, resolution: 'RESOLVED' | 'DISMISSED') =>
    api.post<{ resolvedCount: number }>(ENDPOINTS.questions.resolveReports(questionId), { resolution }),
}
