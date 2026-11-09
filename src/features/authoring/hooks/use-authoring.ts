import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast, type CategoryCode } from '@/design-system'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { optimisticUpdate, optimisticId } from '@/lib/optimistic-cache'
import { applyQuestionOperations } from '../domain/question-cache'
import { queryKeys } from '@/lib/query-keys'
import type { Language, PageResponse, TopicCardView, TopicOverviewView, HomeView } from '@/shared/types/bff'
import type { InfiniteData } from '@tanstack/react-query'
import type { TopicPage } from '@/features/topics/lib/topics-service'

import type { OwnerQuestionReport, ReportDetail, QuestionEditorView } from '../domain/authoring'
import { limitsFor, type LimitReason } from '../domain/limits'
import type { QuestionOperation } from '../domain/question-draft'
import { authoringService } from '../lib/authoring-service'

function closeCachedReports(client: QueryClient, topicId: string, questionId: string, status: 'RESOLVED' | 'DISMISSED') {
  client.setQueriesData<ReportDetail>({ queryKey: ['authoring', topicId, 'report-detail'] }, (detail) =>
    detail?.questionId === questionId && detail.report.status === 'OPEN' ? { ...detail, report: { ...detail.report, status } } : detail)
  client.setQueryData<OwnerQuestionReport[]>(['authoring', topicId, 'question-reports', questionId], (items) =>
    items?.map((report) => report.status === 'OPEN' ? { ...report, status } : report))
}

const retryHint = { description: 'Vérifie ta connexion, puis réessaie.' }

/** Mes sujets, brouillons et publiés. */
export function useMyTopics() {
  return useQuery({ queryKey: queryKeys.authoring.topics(), queryFn: authoringService.myTopics, staleTime: 30_000 })
}

/** Un de mes sujets, lu dans la liste Mes sujets (le BFF n'a pas de vue auteur d'un sujet seul). */
export function useMyTopic(topicId: string) {
  const workshop = useQuery({ queryKey: ['authoring', topicId, 'workshop'], queryFn: () => authoringService.workshop(topicId), enabled: Boolean(topicId) })
  return { ...workshop, topic: workshop.data?.topic, permissions: workshop.data?.permissions }
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
  client.setQueryData<import('../domain/authoring').TopicWorkshop>(['authoring', topicId, 'workshop'], (view) =>
    view ? { ...view, topic: patch(view.topic) } : view,
  )
  client.setQueryData<TopicOverviewView>(queryKeys.topic.overview(topicId), (view) => (view ? { ...view, topic: patch(view.topic) } : view))
  const apply = (topic: TopicCardView) => (topic.topicId === topicId ? patch(topic) : topic)
  client.setQueriesData<InfiniteData<TopicPage>>({ queryKey: ['topics', 'list'] }, (data) =>
    data ? { ...data, pages: data.pages.map((page) => ({ ...page, topics: page.topics.map(apply) })) } : data,
  )
  client.setQueryData<HomeView>(queryKeys.home(), (home) =>
    home
      ? {
          ...home,
          followedTopics: home.followedTopics.map(apply),
          trendingTopics: home.trendingTopics.map(apply),
          newTopics: home.newTopics.map(apply),
          recommendedTopics: home.recommendedTopics.map(apply),
        }
      : home,
  )
}

export function useCreateTopic() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ name, category }: { name: string; category: CategoryCode }) => authoringService.createTopic(name, category),
    onMutate: async ({ name, category }) => {
      const tempId = optimisticId()
      const transaction = await optimisticUpdate(client, [['authoring']], () => {
        const draft: TopicCardView = {
          topicId: tempId,
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
        client.setQueryData<PageResponse<TopicCardView>>(queryKeys.authoring.topics(), (page) =>
          page
            ? { ...page, content: [draft, ...page.content], totalElements: page.totalElements + 1 }
            : { content: [draft], totalElements: 1, totalPages: 1, page: 0, size: 100, first: true, last: true },
        )
      })
      return { ...transaction, tempId }
    },
    onSuccess: ({ id }, _variables, context) => {
      patchTopic(client, context.tempId, (topic) => ({ ...topic, topicId: id }))
      client.setQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(id), [])
    },
    onError: (_error, _variables, context) => {
      context?.rollback()
      toast.error("Le sujet n'a pas pu être créé", retryHint)
    },
  })
}

/** Nom français obligatoire, anglais facultatif : une commande par langue modifiée. */
export function useUpdateTopicNames(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (names: Partial<Record<Language, string>>) => {
      const completedNames: Partial<Record<Language, string>> = {}
      try {
        for (const [language, name] of Object.entries(names) as [Language, string][]) {
          await authoringService.updateName(topicId, language, name)
          completedNames[language] = name
        }
      } catch (cause) {
        throw Object.assign(new Error('partial names', { cause }), { completedNames })
      }
    },
    onMutate: (names: Partial<Record<Language, string>>) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, names: { ...topic.names, ...names } })),
      ),
    onError: (error, _variables, context) => {
      context?.rollback()
      if ('completedNames' in error)
        patchTopic(client, topicId, (topic) => ({ ...topic, names: { ...topic.names, ...(error.completedNames as Partial<Record<Language, string>>) } }))
      toast.error("Le nom n'a pas pu être enregistré", retryHint)
    },
  })
}

export function useUpdateTopicCategory(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (category: CategoryCode) => authoringService.updateCategory(topicId, category),
    onMutate: (category: CategoryCode) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, category })),
      ),
    onError: (_error, _variables, context) => {
      context?.rollback()
      toast.error('L’univers n’a pas pu être enregistré', retryHint)
    },
  })
}

export function useUpdateTopicImage(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (imageUrl: string | null) => authoringService.updateImageUrl(topicId, imageUrl),
    onMutate: (imageUrl: string | null) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, imageUrl })),
      ),
    onError: (_error, _variables, context) => {
      context?.rollback()
      toast.error('La vignette n’a pas pu être enregistrée', retryHint)
    },
  })
}

export function usePublishTopic(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => authoringService.publish(topicId),
    onMutate: () =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, status: 'PUBLISHED' })),
      ),
    onSuccess: () => toast.success('Sujet publié'),
    onError: (_error, _variables, context) => {
      context?.rollback()
      toast.error("Le sujet n'a pas pu être publié", { description: 'Il faut 7 questions approuvées.' })
    },
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
  const approved = questions.filter((question) => question.status === 'APPROVED').length
  patchTopic(client, topicId, (topic) => ({ ...topic, questionsCount: approved }))
}

export function useSaveQuestion(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({
      questionId,
      operations,
      resolveReports,
    }: {
      questionId?: string
      operations: readonly QuestionOperation[]
      resolveReports?: boolean
    }) => {
      const id = await authoringService.saveQuestion(topicId, questionId, operations)
      let reportsResolved = true
      if (resolveReports) {
        try {
          await authoringService.resolveReports(id, 'RESOLVED')
        } catch {
          reportsResolved = false
        }
      }
      return { id, reportsResolved }
    },
    onMutate: async ({ questionId, operations, resolveReports }) => {
      const localId = questionId ?? optimisticId()
      const transaction = await optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () => {
        client.setQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId), (list) => {
          const next = applyQuestionOperations(
            list?.find((question) => question.questionId === localId),
            localId,
            operations,
          )
          return next
            ? list?.some((question) => question.questionId === localId)
              ? list.map((question) => (question.questionId === localId ? next : question))
              : [next, ...(list ?? [])]
            : list
        })
        if (questionId && operations.length > 0)
          patchQuestion(client, topicId, questionId, (q) => (q.status === 'REJECTED' ? { ...q, status: 'PENDING', rejectionReason: null } : q))
        syncApprovedCount(client, topicId)
      })
      const reportTransaction = resolveReports
        ? await optimisticUpdate(client, [['authoring']], () => {
            closeCachedReports(client, topicId, localId, 'RESOLVED')
            patchQuestion(client, topicId, localId, (question) => ({ ...question, openReportCount: 0 }))
            client.setQueriesData<ReportedQuestion[]>({ queryKey: queryKeys.authoring.reports(topicId) }, (items) =>
              items?.filter((item) => item.question.questionId !== localId),
            )
          })
        : undefined
      return { ...transaction, reportTransaction, localId }
    },
    onSuccess: ({ id, reportsResolved }, _variables, context) => {
      if (!reportsResolved) {
        context.reportTransaction?.rollback()
        toast.error('Question enregistrée, mais les signalements restent à clore', retryHint)
      }
      patchQuestion(client, topicId, context.localId, (question) => ({ ...question, questionId: id }))
      toast.success('Question enregistrée')
    },
    onError: (error, _variables, context) => {
      context?.reportTransaction?.rollback()
      context?.rollback()
      if ('completedOperations' in error && Array.isArray(error.completedOperations) && 'questionId' in error && typeof error.questionId === 'string') {
        const id = error.questionId
        const completed = error.completedOperations as QuestionOperation[]
        client.setQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId), (list) => {
          const next = applyQuestionOperations(
            list?.find((question) => question.questionId === id),
            id,
            completed,
          )
          return next
            ? list?.some((question) => question.questionId === id)
              ? list.map((question) => (question.questionId === id ? next : question))
              : [next, ...(list ?? [])]
            : list
        })
        syncApprovedCount(client, topicId)
      }
      toast.error("La question n'a pas pu être entièrement enregistrée", retryHint)
    },
  })
}

export function useModerateQuestion(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, decision, reason }: { questionId: string; decision: 'approve' | 'reject'; reason?: string }) =>
      decision === 'approve' ? authoringService.approve(questionId) : authoringService.reject(questionId, reason ?? ''),
    onMutate: ({ questionId, decision }) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () => {
        patchQuestion(client, topicId, questionId, (question) => ({
          ...question,
          status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
          suspended: false,
          archived: false,
        }))
        syncApprovedCount(client, topicId)
      }),
    onSuccess: (_result, { decision }) => toast.success(decision === 'approve' ? 'Question approuvée' : 'Question rejetée'),
    onError: (_error, { decision }, context) => {
      context?.rollback()
      toast.error(decision === 'approve' ? "La question n'a pas pu être approuvée" : "La question n'a pas pu être rejetée", retryHint)
    },
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
    onMutate: (questionId: string) =>
      optimisticUpdate(client, [['authoring']], () => {
        closeCachedReports(client, topicId, questionId, 'DISMISSED')
        patchQuestion(client, topicId, questionId, (question) => ({ ...question, openReportCount: 0 }))
        client.setQueriesData<ReportedQuestion[]>({ queryKey: queryKeys.authoring.reports(topicId) }, (items) =>
          items?.filter((item) => item.question.questionId !== questionId),
        )
      }),
    onSuccess: () => toast.success('Signalement clos'),
    onError: (_error, _variables, context) => {
      context?.rollback()
      toast.error("Le signalement n'a pas pu être clos", retryHint)
    },
  })
}

export function useTeam(topicId: string) {
  return useQuery({ queryKey: ['authoring', topicId, 'team'], queryFn: () => authoringService.team(topicId), enabled: Boolean(topicId) })
}
export function useTeamChange(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ member, remove }: { member: import('../domain/authoring').TeamMember; remove?: boolean }) =>
      remove ? authoringService.removeMember(topicId, member.userId) : authoringService.setMember(topicId, member.userId, member.role),
    onMutate: ({ member, remove }) =>
      optimisticUpdate(client, [['authoring', topicId, 'team']], () => {
        client.setQueryData<import('../domain/authoring').TeamMember[]>(['authoring', topicId, 'team'], (items) =>
          remove ? items?.filter((m) => m.userId !== member.userId) : [...(items ?? []).filter((m) => m.userId !== member.userId), member],
        )
      }),
    onSuccess: (member) => {
      if (member)
        client.setQueryData<import('../domain/authoring').TeamMember[]>(['authoring', topicId, 'team'], (items) =>
          items?.map((item) => (item.userId === member.userId ? member : item)),
        )
    },
    onError: (_error, _variables, context) => {
      context?.rollback()
      toast.error("L'équipe n'a pas pu être modifiée", { description: 'Les administrateurs doivent être Premium.' })
    },
  })
}
export function useDraftTopic(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => authoringService.draft(topicId),
    onMutate: () =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (t) => ({ ...t, status: 'DRAFT' })),
      ),
    onError: (_e, _v, context) => {
      context?.rollback()
      toast.error('Le sujet n’a pas pu repasser en brouillon')
    },
  })
}
export function useDeleteQuestion(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => authoringService.deleteQuestion(id),
    onMutate: (id: string) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () => {
        client.setQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId), (items) => items?.filter((q) => q.questionId !== id))
        syncApprovedCount(client, topicId)
        const questions = client.getQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId))
        if (questions && questions.filter((q) => q.status === 'APPROVED').length < 7) patchTopic(client, topicId, (t) => ({ ...t, status: 'DRAFT' }))
      }),
    onError: (_e, _v, context) => {
      context?.rollback()
      toast.error('La question n’a pas pu être supprimée')
    },
  })
}

export function useArchiveQuestion(topicId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ id, restore }: { id: string; restore?: boolean }) => (restore ? authoringService.restore(id) : authoringService.archive(id)),
    onMutate: ({ id, restore }) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () => {
        patchQuestion(client, topicId, id, (q) => ({ ...q, status: restore ? 'PENDING' : 'ARCHIVED', archived: !restore, suspended: false }))
        syncApprovedCount(client, topicId)
        const questions = client.getQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId))
        if (!restore && questions && questions.filter((q) => q.status === 'APPROVED').length < 7)
          patchTopic(client, topicId, (t) => ({ ...t, status: 'DRAFT' }))
      }),
    onError: (_e, _v, context) => {
      context?.rollback()
      toast.error('La question n’a pas pu être mise à jour')
    },
  })
}
