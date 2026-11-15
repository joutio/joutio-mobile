import { descriptionsDraft } from '@joutio/client/authoring'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { toast, type CategoryCode } from '@/design-system'
import { useMe } from '@/features/me'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { optimisticUpdate, optimisticId } from '@/lib/optimistic-cache'
import { applyQuestionOperations } from '@joutio/client/authoring'
import { queryKeys } from '@/lib/query-keys'
import type { Language, PageResponse, TopicCardView, TopicOverviewView, HomeView } from '@joutio/client/api-types'
import type { InfiniteData } from '@tanstack/react-query'
import type { TopicPage } from '@/features/topics/lib/topics-service'

import type {
  OwnerQuestionReport,
  ReportDetail,
  QuestionEditorView,
  ReportedQuestion,
  TopicTitles,
  TopicTodo,
  TopicWorkshop,
} from '@joutio/client/authoring'
import type { MeView } from '@joutio/client/api-types'
import { isFrozen, planLimits, premiumReasonOf, quotaProblemOf, type PremiumReason } from '@joutio/client/premium'
import type { QuestionOperation } from '@joutio/client/authoring'
import { authoringService } from '../lib/authoring-service'
import { t, useT } from '@/lib/i18n'

function closeCachedReports(client: QueryClient, topicId: string, questionId: string, status: 'RESOLVED' | 'DISMISSED') {
  client.setQueriesData<ReportDetail>({ queryKey: ['authoring', topicId, 'report-detail'] }, (detail) =>
    detail?.questionId === questionId && detail.report.status === 'OPEN' ? { ...detail, report: { ...detail.report, status } } : detail,
  )
  client.setQueryData<OwnerQuestionReport[]>(['authoring', topicId, 'question-reports', questionId], (items) =>
    items?.map((report) => (report.status === 'OPEN' ? { ...report, status } : report)),
  )
}

/** Lu à l'appel : la langue peut changer après le chargement du module. */
const retryHint = () => ({ description: t('home.errorText') })

/** Mes sujets › À traiter, ajusté sur place quand une action est traitée (signalements clos, question modérée). */
function patchTodo(client: QueryClient, topicId: string, patch: (todo: TopicTodo) => TopicTodo) {
  client.setQueryData<TopicTodo[]>(queryKeys.authoring.todo(), (items) =>
    items?.map((todo) => (todo.topicId === topicId ? patch(todo) : todo)).filter((todo) => todo.pending + todo.reportedQuestions > 0),
  )
}

/** Retire une question de la file des signalements et du compteur « À traiter ». */
function dropFromQueue(client: QueryClient, topicId: string, questionId: string) {
  const queue = client.getQueryData<ReportedQuestion[]>(queryKeys.authoring.reports(topicId))
  if (queue?.some((item) => item.question.questionId === questionId))
    patchTodo(client, topicId, (todo) => ({ ...todo, reportedQuestions: Math.max(0, todo.reportedQuestions - 1) }))
  client.setQueryData<ReportedQuestion[]>(queryKeys.authoring.reports(topicId), (items) => items?.filter((item) => item.question.questionId !== questionId))
}

/** Mes sujets › À traiter : actions en attente par sujet géré. */
export function useTopicTodo() {
  return useQuery({ queryKey: queryKeys.authoring.todo(), queryFn: authoringService.todo, staleTime: 30_000 })
}

/** File des signalements ouverts d'un sujet (écran Signalements et Modération › Signalements). */
export function useReportQueue(topicId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.authoring.reports(topicId),
    queryFn: () => authoringService.reportQueue(topicId),
    enabled: enabled && Boolean(topicId),
    staleTime: 15_000,
  })
}

/** Supprime un brouillon : il quitte Mes sujets sur place. */
export function useDeleteTopic(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => authoringService.deleteTopic(topicId),
    onMutate: () =>
      optimisticUpdate(client, [['authoring']], () => {
        client.setQueryData<PageResponse<TopicCardView>>(queryKeys.authoring.topics(), (page) =>
          page ? { ...page, content: page.content.filter((topic) => topic.topicId !== topicId), totalElements: Math.max(0, page.totalElements - 1) } : page,
        )
        client.setQueryData<TopicTodo[]>(queryKeys.authoring.todo(), (items) => items?.filter((todo) => todo.topicId !== topicId))
      }),
    onSuccess: () => toast.success(t('workshop.deleted')),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.deleteError'), retryHint())
    },
  })
}

/** Mes sujets, brouillons et publiés. */
export function useMyTopics(enabled = true) {
  return useQuery({ queryKey: queryKeys.authoring.topics(), queryFn: authoringService.myTopics, staleTime: 30_000, enabled })
}

/** Un de mes sujets, lu dans la liste Mes sujets (le BFF n'a pas de vue auteur d'un sujet seul). */
export function useMyTopic(topicId: string) {
  const workshop = useQuery({ queryKey: ['authoring', topicId, 'workshop'], queryFn: () => authoringService.workshop(topicId), enabled: Boolean(topicId) })
  return { ...workshop, topic: workshop.data?.topic, permissions: workshop.data?.permissions, titles: workshop.data?.titles ?? null, closedReason: workshop.data?.closedReason ?? null }
}

/** Limites du plan lues dans `MeView.limits` (appliquées par le BFF) et feuille Premium avec l'accroche dédiée. */
export function useCreationLimits() {
  const me = useMe(true)
  const show = usePremiumSheet((state) => state.show)
  const premium = me.data?.premium ?? false
  return { premium, limits: planLimits(me.data), askPremium: (reason: PremiumReason) => show(reason) }
}

/** Sujets dont je suis le créateur : seuls comptent dans le plafond de sujets publiés. */
export function useCreatedTopics(enabled = true) {
  return useQuery({ queryKey: queryKeys.authoring.created(), queryFn: authoringService.createdTopics, staleTime: 30_000, enabled })
}

/**
 * Sujets gelés (`creation.md` § 3, P21) : sans Premium, au-delà du plafond de sujets publiés, mes sujets publiés ne se
 * modifient plus. `locks` ne vaut que pour le créateur ; un membre de l'équipe l'apprend du BFF (`topic:overQuota`).
 */
export function useFrozen() {
  const me = useMe(true).data
  const created = useCreatedTopics(Boolean(me))
  const published = created.data?.content.filter((topic) => topic.status === 'PUBLISHED').length ?? 0
  const frozen = isFrozen(me, published)
  return {
    frozen,
    published,
    limit: planLimits(me).publishedTopics,
    locks: (topic: Pick<TopicCardView, 'status'> | undefined, role: string | undefined) => frozen && role === 'creator' && topic?.status === 'PUBLISHED',
  }
}

/** Limite du plan dans une erreur (éventuellement enveloppée : `cause`) : ouvre la feuille Premium, sans Premium. */
function limitHit(client: QueryClient, error: unknown) {
  const problem = quotaProblemOf(error) ?? (error instanceof Error ? quotaProblemOf(error.cause) : null)
  if (!problem) return false
  if (client.getQueryData<MeView>(queryKeys.me())?.premium) {
    toast.error(t('mobile.authoring.toast.limitReached'))
    return true
  }
  usePremiumSheet.getState().show(premiumReasonOf(problem))
  return true
}

/** Remplace un de mes sujets dans la liste, sur place. */
function patchTopic(client: QueryClient, topicId: string, patch: (topic: TopicCardView) => TopicCardView) {
  client.setQueryData<PageResponse<TopicCardView>>(queryKeys.authoring.created(), (page) =>
    page ? { ...page, content: page.content.map((topic) => (topic.topicId === topicId ? patch(topic) : topic)) } : page,
  )
  client.setQueryData<PageResponse<TopicCardView>>(queryKeys.authoring.topics(), (page) =>
    page ? { ...page, content: page.content.map((topic) => (topic.topicId === topicId ? patch(topic) : topic)) } : page,
  )
  client.setQueryData<import('@joutio/client/authoring').TopicWorkshop>(['authoring', topicId, 'workshop'], (view) =>
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
  const t = useT()
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
          pictogramUrl: null,
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
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.createError'), retryHint())
    },
  })
}

/** Nom français obligatoire, anglais facultatif : une commande par langue modifiée. */
export function useUpdateTopicNames(topicId: string) {
  const t = useT()
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
      if (limitHit(client, error)) return
      toast.error(t('workshop.nameError'), retryHint())
    },
  })
}

export function useUpdateTopicCategory(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (category: CategoryCode) => authoringService.updateCategory(topicId, category),
    onMutate: (category: CategoryCode) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, category })),
      ),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.categoryError'), retryHint())
    },
  })
}

export function useUpdateTopicImage(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (imageUrl: string | null) => authoringService.updateImageUrl(topicId, imageUrl),
    onMutate: (imageUrl: string | null) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, imageUrl })),
      ),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.imageError'), retryHint())
    },
  })
}

/** Pictogramme carré du sujet (`TopicTile`) : PNG envoyé par le créateur, les SVG viennent du seed. */
export function useUpdateTopicPictogram(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (pictogramUrl: string | null) => authoringService.updatePictogramUrl(topicId, pictogramUrl),
    onMutate: (pictogramUrl: string | null) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, pictogramUrl })),
      ),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.pictogramError'), retryHint())
    },
  })
}

/**
 * Description dans une langue : l'atelier, les listes et la fiche sujet (sous le titre) changent tout de suite. Le
 * champ `description` historique suit la française.
 */
export function useUpdateTopicDescription(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ description, language }: { description: string | null; language: 'fr' | 'en' }) =>
      authoringService.updateDescription(topicId, description, language),
    onMutate: ({ description, language }: { description: string | null; language: 'fr' | 'en' }) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => {
          const descriptions = { ...descriptionsDraft(topic), [language]: description ?? '' }
          const kept = Object.fromEntries(Object.entries(descriptions).filter(([, value]) => value !== ''))
          return { ...topic, descriptions: kept, description: kept.fr ?? null }
        }),
      ),
    onSuccess: () => toast.success(t('mobile.authoring.toast.descriptionSaved')),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('mobile.authoring.toast.descriptionFailed'), retryHint())
    },
  })
}

/** Titres par palier : l'atelier et la fiche sujet (onglet Progression) changent tout de suite. */
export function useUpdateTopicTitles(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (titles: TopicTitles | null) => authoringService.updateTitles(topicId, titles),
    onMutate: (titles: TopicTitles | null) =>
      optimisticUpdate(client, [['authoring', topicId, 'workshop'], queryKeys.topic.overview(topicId)], () => {
        client.setQueryData<TopicWorkshop>(['authoring', topicId, 'workshop'], (workshop) => (workshop ? { ...workshop, titles } : workshop))
        client.setQueryData<TopicOverviewView>(queryKeys.topic.overview(topicId), (overview) => (overview ? { ...overview, titles } : overview))
      }),
    onSuccess: () => toast.success(t('workshop.titlesSaved')),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.titlesError'), retryHint())
    },
  })
}

export function usePublishTopic(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => authoringService.publish(topicId),
    onMutate: () =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (topic) => ({ ...topic, status: 'PUBLISHED' })),
      ),
    onSuccess: () => toast.success(t('workshop.published')),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.publishError'), { description: t('workshop.publishErrorText') })
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
  const t = useT()
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
            dropFromQueue(client, topicId, localId)
          })
        : undefined
      return { ...transaction, reportTransaction, localId }
    },
    onSuccess: ({ id, reportsResolved }, _variables, context) => {
      if (!reportsResolved) {
        context.reportTransaction?.rollback()
        toast.error(t('workshop.reportsStillOpen'), retryHint())
      }
      patchQuestion(client, topicId, context.localId, (question) => ({ ...question, questionId: id }))
      toast.success(t('workshop.questionSaved'))
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
      if (limitHit(client, error)) return
      toast.error(t('workshop.questionError'), retryHint())
    },
  })
}

export function useModerateQuestion(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ questionId, decision, reason }: { questionId: string; decision: 'approve' | 'reject'; reason?: string }) =>
      decision === 'approve' ? authoringService.approve(questionId) : authoringService.reject(questionId, reason ?? ''),
    onMutate: ({ questionId, decision }) =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () => {
        const before = client.getQueryData<QuestionEditorView[]>(queryKeys.authoring.questions(topicId))?.find((question) => question.questionId === questionId)
        if (before?.status === 'PENDING') patchTodo(client, topicId, (todo) => ({ ...todo, pending: Math.max(0, todo.pending - 1) }))
        patchQuestion(client, topicId, questionId, (question) => ({
          ...question,
          status: decision === 'approve' ? 'APPROVED' : 'REJECTED',
          suspended: false,
          archived: false,
        }))
        syncApprovedCount(client, topicId)
      }),
    onSuccess: (_result, { decision }) => toast.success(decision === 'approve' ? t('workshop.approved') : t('workshop.rejected')),
    onError: (error, { decision }, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(decision === 'approve' ? t('workshop.approveError') : t('workshop.rejectError'), retryHint())
    },
  })
}

/** « Clore sans modifier » : les signalements ouverts de la question sont écartés. */
export function useDismissReports(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: (questionId: string) => authoringService.resolveReports(questionId, 'DISMISSED'),
    onMutate: (questionId: string) =>
      optimisticUpdate(client, [['authoring']], () => {
        closeCachedReports(client, topicId, questionId, 'DISMISSED')
        patchQuestion(client, topicId, questionId, (question) => ({ ...question, openReportCount: 0 }))
        dropFromQueue(client, topicId, questionId)
      }),
    onSuccess: () => toast.success(t('workshop.reportsClosed')),
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.reportsCloseError'), retryHint())
    },
  })
}

export function useTeam(topicId: string) {
  return useQuery({ queryKey: ['authoring', topicId, 'team'], queryFn: () => authoringService.team(topicId), enabled: Boolean(topicId) })
}
export function useTeamChange(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ member, remove }: { member: import('@joutio/client/authoring').TeamMember; remove?: boolean }) =>
      remove ? authoringService.removeMember(topicId, member.userId) : authoringService.setMember(topicId, member.userId, member.role),
    onMutate: ({ member, remove }) =>
      optimisticUpdate(client, [['authoring', topicId, 'team']], () => {
        client.setQueryData<import('@joutio/client/authoring').TeamMember[]>(['authoring', topicId, 'team'], (items) =>
          remove ? items?.filter((m) => m.userId !== member.userId) : [...(items ?? []).filter((m) => m.userId !== member.userId), member],
        )
      }),
    onSuccess: (member) => {
      if (member)
        client.setQueryData<import('@joutio/client/authoring').TeamMember[]>(['authoring', topicId, 'team'], (items) =>
          items?.map((item) => (item.userId === member.userId ? member : item)),
        )
    },
    onError: (error, _variables, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.teamError'), { description: t('workshop.teamErrorText') })
    },
  })
}
export function useDraftTopic(topicId: string) {
  const t = useT()
  const client = useQueryClient()
  return useMutation({
    mutationFn: () => authoringService.draft(topicId),
    onMutate: () =>
      optimisticUpdate(client, [['authoring'], ['topic', topicId], ['topics'], queryKeys.home()], () =>
        patchTopic(client, topicId, (t) => ({ ...t, status: 'DRAFT' })),
      ),
    onError: (error, _v, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.draftError'))
    },
  })
}
export function useDeleteQuestion(topicId: string) {
  const t = useT()
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
    onError: (error, _v, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.questionDeleteError'))
    },
  })
}

export function useArchiveQuestion(topicId: string) {
  const t = useT()
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
    onError: (error, _v, context) => {
      context?.rollback()
      if (limitHit(client, error)) return
      toast.error(t('workshop.lifecycleError'))
    },
  })
}
