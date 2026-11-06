import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast, type CategoryCode } from '@/design-system'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { queryKeys } from '@/lib/query-keys'
import type { Language, PageResponse, TopicCardView } from '@/shared/types/bff'
import type { OwnerQuestionReport, QuestionEditorView } from '../domain/authoring'
import { limitsFor, type LimitReason } from '../domain/limits'
import type { QuestionOperation } from '../domain/question-draft'
import { authoringService } from '../lib/authoring-service'

const retryHint = { description: 'Vérifie ta connexion, puis réessaie.' }

/** Mes sujets, brouillons et publiés. */
export function useMyTopics() {
  return useQuery({ queryKey: queryKeys.authoring.topics(), queryFn: authoringService.myTopics, staleTime: 30_000 })
}

/** Un de mes sujets, lu dans la liste Mes sujets (le BFF n'a pas de vue auteur d'un sujet seul). */
export function useMyTopic(topicId: string) {
  const topics = useMyTopics()
  return { ...topics, topic: topics.data?.content.find((topic) => topic.topicId === topicId) }
}

/** Plafonds Gratuit / Premium (appliqués par l'app) et ouverture de la feuille Premium avec l'accroche dédiée. */
export function useCreationLimits() {
  const me = useMe(true)
  const show = usePremiumSheet((state) => state.show)
  const premium = me.data?.premium ?? false
  return { premium, limits: limitsFor(premium), askPremium: (reason: LimitReason) => show(reason) }
}

/** Remplace un de mes sujets dans la liste, sur place. */
function patchTopic(client: QueryClient, topicId: string, patch: (topic: TopicCardView) => TopicCardView) {
  client.setQueryData<PageResponse<TopicCardView>>(queryKeys.authoring.topics(), (page) =>
    page ? { ...page, content: page.content.map((topic) => (topic.topicId === topicId ? patch(topic) : topic)) } : page,
  )
}

export function useCreateTopic() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ name, category }: { name: string; category: CategoryCode }) => authoringService.createTopic(name, category),
    onSuccess: ({ id }, { name, category }) => {
      // Le brouillon apparaît tout de suite ; la projection le confirme au prochain chargement.
      client.setQueryData<PageResponse<TopicCardView>>(queryKeys.authoring.topics(), (page) => {
        const draft: TopicCardView = {
          topicId: id,
          names: { fr: name },
          description: null,
          category,
          categoryLabel: '',
          imageUrl: null,
          bannerUrl: null,
          followersCount: 0,
          questionsCount: 0,
          followed: false,
          status: 'DRAFT',
        }
        return page ? { ...page, content: [draft, ...page.content], totalElements: page.totalElements + 1 } : page
      })
      client.setQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(id), [])
    },
    onError: () => toast.error("Le sujet n'a pas pu être créé", retryHint),
  })
}

/** Nom français obligatoire, anglais facultatif : une commande par langue modifiée. */
export function useUpdateTopicNames(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (names: Partial<Record<Language, string>>) => {
      for (const [language, name] of Object.entries(names) as [Language, string][]) await authoringService.updateName(topicId, language, name)
    },
    onSuccess: (_result, names) => patchTopic(client, topicId, (topic) => ({ ...topic, names: { ...topic.names, ...names } })),
    onError: () => toast.error("Le nom n'a pas pu être enregistré", retryHint),
  })
}

export function useUpdateTopicCategory(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (category: CategoryCode) => authoringService.updateCategory(topicId, category),
    onSuccess: (_result, category) => patchTopic(client, topicId, (topic) => ({ ...topic, category })),
    onError: () => toast.error("L'univers n'a pas pu être enregistré", retryHint),
  })
}

export function useUpdateTopicImage(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (imageUrl: string | null) => authoringService.updateImageUrl(topicId, imageUrl),
    onSuccess: (_result, imageUrl) => patchTopic(client, topicId, (topic) => ({ ...topic, imageUrl })),
    onError: () => toast.error("La vignette n'a pas pu être enregistrée", retryHint),
  })
}

export function usePublishTopic(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => authoringService.publish(topicId),
    onSuccess: () => {
      patchTopic(client, topicId, (topic) => ({ ...topic, status: 'PUBLISHED' }))
      // Le catalogue et l'Accueil découvriront le sujet à leur prochain chargement.
      void client.invalidateQueries({ queryKey: ['topics'] })
      toast.success('Sujet publié')
    },
    onError: () => toast.error("Le sujet n'a pas pu être publié", { description: 'Il faut 7 questions approuvées.' }),
  })
}

/** Toutes les questions du sujet (hors archivées). */
export function useTopicQuestions(topicId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.authoring.questions(topicId),
    queryFn: () => authoringService.questions(topicId),
    enabled: enabled && Boolean(topicId),
    staleTime: 15_000,
  })
}

/** Remplace une question dans le cache, sur place. */
function patchQuestion(client: QueryClient, topicId: string, questionId: string, patch: (question: QuestionEditorView) => QuestionEditorView) {
  client.setQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId), (list) =>
    list?.map((question) => (question.questionId === questionId ? patch(question) : question)),
  )
}

/** Compteur d'approuvées de la liste Mes sujets, recalculé depuis les questions en cache. */
function syncApprovedCount(client: QueryClient, topicId: string) {
  const questions = client.getQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId))
  if (!questions) return
  const approved = questions.filter((question) => question.status === 'APPROVED' && !question.suspended).length
  patchTopic(client, topicId, (topic) => ({ ...topic, questionsCount: approved }))
}

export function useSaveQuestion(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, operations }: { questionId?: string; operations: readonly QuestionOperation[]; resolveReports?: boolean }) =>
      authoringService.saveQuestion(topicId, questionId, operations),
    onSuccess: async (questionId, { resolveReports }) => {
      if (resolveReports) await authoringService.resolveReports(questionId, 'RESOLVED').catch(() => undefined)
      // La question modifiée repasse en validation côté serveur : on relit la liste plutôt que de deviner son statut.
      await client.invalidateQueries({ queryKey: queryKeys.authoring.questions(topicId) })
      if (resolveReports) void client.invalidateQueries({ queryKey: queryKeys.authoring.reports(topicId) })
      syncApprovedCount(client, topicId)
      toast.success('Question enregistrée')
    },
    onError: () => toast.error("La question n'a pas pu être enregistrée", retryHint),
  })
}

export function useModerateQuestion(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, decision, reason }: { questionId: string; decision: 'approve' | 'reject'; reason?: string }) =>
      decision === 'approve' ? authoringService.approve(questionId) : authoringService.reject(questionId, reason ?? ''),
    onSuccess: (_result, { questionId, decision }) => {
      patchQuestion(client, topicId, questionId, (question) => ({ ...question, status: decision === 'approve' ? 'APPROVED' : 'REJECTED' }))
      syncApprovedCount(client, topicId)
      toast.success(decision === 'approve' ? 'Question approuvée' : 'Question rejetée')
    },
    onError: (_error, { decision }) =>
      toast.error(decision === 'approve' ? "La question n'a pas pu être approuvée" : "La question n'a pas pu être rejetée", retryHint),
  })
}

export interface ReportedQuestion {
  question: QuestionEditorView
  reports: OwnerQuestionReport[]
}

/** Signalements ouverts du sujet : questions avec `openReportCount > 0`, puis leurs signalements (le BFF n'agrège pas). */
export function useTopicReports(topicId: string, questions: readonly QuestionEditorView[] | undefined) {
  const reported = (questions ?? []).filter((question) => question.openReportCount > 0)
  return useQuery({
    queryKey: [...queryKeys.authoring.reports(topicId), reported.map((question) => question.questionId)],
    queryFn: async (): Promise<ReportedQuestion[]> => {
      const lists = await Promise.all(reported.map((question) => authoringService.reports(question.questionId)))
      return reported
        .map((question, index) => ({ question, reports: (lists[index] ?? []).filter((report) => report.status === 'OPEN') }))
        .filter((item) => item.reports.length > 0)
    },
    enabled: questions !== undefined,
    staleTime: 15_000,
  })
}

/** « Clore sans modifier » : les signalements ouverts de la question sont écartés. */
export function useDismissReports(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => authoringService.resolveReports(questionId, 'DISMISSED'),
    onSuccess: (_result, questionId) => {
      patchQuestion(client, topicId, questionId, (question) => ({ ...question, openReportCount: 0 }))
      toast.success('Signalement clos')
    },
    onError: () => toast.error("Le signalement n'a pas pu être clos", retryHint),
  })
}
