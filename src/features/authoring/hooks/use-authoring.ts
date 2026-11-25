import {
  useArchiveQuestion as useLibArchiveQuestion,
  useContributedTopics,
  useCreatedTopics as useLibCreatedTopics,
  useCreateTopic as useLibCreateTopic,
  useDeleteQuestion as useLibDeleteQuestion,
  useDeleteTopic as useLibDeleteTopic,
  useDismissReports as useLibDismissReports,
  useDraftTopic as useLibDraftTopic,
  useModerateQuestion as useLibModerateQuestion,
  usePublishTopic as useLibPublishTopic,
  useSameNameTopic as useLibSameNameTopic,
  useSaveQuestion as useLibSaveQuestion,
  useTeam as useLibTeam,
  useTeamChange as useLibTeamChange,
  useTopicQuestions as useLibTopicQuestions,
  useReportQueue as useLibReportQueue,
  useUpdateTopicCategory as useLibUpdateTopicCategory,
  useUpdateTopicDescription as useLibUpdateTopicDescription,
  useUpdateTopicImage as useLibUpdateTopicImage,
  useUpdateTopicNames as useLibUpdateTopicNames,
  useUpdateTopicPictogram as useLibUpdateTopicPictogram,
  useUpdateTopicTitles as useLibUpdateTopicTitles,
  useWorkshop,
  useWorkshopTodo,
} from '@joutio/client/authoring'
import type { TopicCardView } from '@joutio/client/topics'
import { useIsPremium, useMe } from '@joutio/client/me'
import { isFrozen, planLimits, premiumReasonOf, quotaProblemOf, type PremiumReason } from '@joutio/client/premium'
import { toast } from '@/design-system'
import { usePremiumSheet } from '@/features/premium/premium-store'
import { useDebounced } from '@/shared/hooks/use-debounced'
import { t } from '@/lib/i18n'

/**
 * Atelier : lectures et mutations de `@joutio/client/authoring`, optimistes et sans relecture. L'app n'y ajoute que ses
 * retours (toasts, feuille Premium sur une limite du plan), passés à `mutate(v, { onSuccess, onError })`.
 */

/** Ce que l'app lit d'une mutation de la lib. */
interface Mutation<V, D> {
  isPending: boolean
  variables: V | undefined
  mutate: (variables: V, options?: { onSuccess?: (data: D, variables: V) => void; onError?: (error: Error, variables: V) => void }) => void
}

/** Suite donnée par l'écran (fermer, revenir) une fois la commande acceptée. */
interface Then<D> {
  onSuccess?: (data: D) => void
}

interface Feedback<V, D> {
  success?: (variables: V, data: D) => string | undefined
  error: (variables: V) => string
  description?: () => string
}

/** Limite du plan dans une erreur (éventuellement enveloppée : `cause`) : feuille Premium sans Premium, toast sinon. */
function limitHit(error: unknown, premium: boolean | undefined) {
  const problem = quotaProblemOf(error) ?? (error instanceof Error ? quotaProblemOf(error.cause) : null)
  if (!problem) return false
  if (premium) toast.error(t('mobile.authoring.toast.limitReached'))
  else usePremiumSheet.getState().show(premiumReasonOf(problem))
  return true
}

/** Une mutation de la lib et ses retours : toast de succès, limite du plan, toast d'erreur. */
function useFeedback<V, D>(mutation: Mutation<V, D>, feedback: Feedback<V, D>) {
  const premium = useIsPremium().data
  return {
    isPending: mutation.isPending,
    variables: mutation.variables,
    mutate: (variables: V, then?: Then<D>) =>
      mutation.mutate(variables, {
        onSuccess: (data) => {
          const message = feedback.success?.(variables, data)
          if (message) toast.success(message)
          then?.onSuccess?.(data)
        },
        onError: (error) => {
          if (limitHit(error, premium)) return
          toast.error(feedback.error(variables), { description: (feedback.description ?? (() => t('home.errorText')))() })
        },
      }),
  }
}

/* ───────────────────────── Lectures ───────────────────────── */

/** Mes sujets › À traiter : actions en attente par sujet géré. */
export const useTopicTodo = () => useWorkshopTodo()

/** Mes sujets, brouillons et publiés (sujets auxquels je contribue). */
export const useMyTopics = () => useContributedTopics()

/** File des signalements ouverts d'un sujet (écran Signalements et Modération › Signalements). */
export const useReportQueue = (topicId: string) => useLibReportQueue(topicId || undefined)

/** Toutes les questions du sujet (hors archivées). */
export const useTopicQuestions = (topicId: string) => useLibTopicQuestions(topicId || undefined)

export const useTeam = (topicId: string) => useLibTeam(topicId || undefined)

/** Un de mes sujets, lu dans son atelier. */
export function useMyTopic(topicId: string) {
  const workshop = useWorkshop(topicId || undefined)
  return {
    ...workshop,
    topic: workshop.data?.topic,
    permissions: workshop.data?.permissions,
    titles: workshop.data?.titles ?? null,
    closedReason: workshop.data?.closedReason ?? null,
  }
}

/** Limites du plan lues dans `MeView.limits` (appliquées par le BFF) et feuille Premium avec l'accroche dédiée. */
export function useCreationLimits() {
  const me = useMe()
  const show = usePremiumSheet((state) => state.show)
  const premium = me.data?.premium ?? false
  return { premium, limits: planLimits(me.data), askPremium: (reason: PremiumReason) => show(reason) }
}

/**
 * Sujets gelés (`creation.md` § 3, P21) : sans Premium, au-delà du plafond de sujets publiés, mes sujets publiés ne se
 * modifient plus. `locks` ne vaut que pour le créateur ; un membre de l'équipe l'apprend du BFF (`topic:overQuota`).
 */
export function useFrozen() {
  const me = useMe().data
  const created = useLibCreatedTopics()
  const published = created.data?.content.filter((topic) => topic.status === 'PUBLISHED').length ?? 0
  const frozen = isFrozen(me, published)
  return {
    frozen,
    published,
    limit: planLimits(me).publishedTopics,
    locks: (topic: Pick<TopicCardView, 'status'> | undefined, role: string | undefined) => frozen && role === 'creator' && topic?.status === 'PUBLISHED',
  }
}

/**
 * Sujet publié qui porte déjà ce nom (2026-11-16) : avertissement non bloquant de la feuille « Nouveau sujet ». Recherche
 * après 300 ms sans frappe (temporisation de l'app), dès 3 caractères.
 */
export function useSameNameTopic(name: string) {
  const search = useDebounced(name.trim(), 300)
  const match = useLibSameNameTopic(search)
  return search === name.trim() ? match.data : undefined
}

/* ───────────────────────── Sujet ───────────────────────── */

export const useCreateTopic = () => useFeedback(useLibCreateTopic(), { error: () => t('workshop.createError') })

export const useDeleteTopic = (topicId: string) =>
  useFeedback(useLibDeleteTopic(topicId), { success: () => t('workshop.deleted'), error: () => t('workshop.deleteError') })

/** Nom français obligatoire, anglais facultatif : une commande par langue modifiée. */
export const useUpdateTopicNames = (topicId: string) => useFeedback(useLibUpdateTopicNames(topicId), { error: () => t('workshop.nameError') })

export const useUpdateTopicCategory = (topicId: string) => useFeedback(useLibUpdateTopicCategory(topicId), { error: () => t('workshop.categoryError') })

export const useUpdateTopicImage = (topicId: string) => useFeedback(useLibUpdateTopicImage(topicId), { error: () => t('workshop.imageError') })

/** Pictogramme carré du sujet (`TopicTile`) : PNG envoyé par le créateur, les SVG viennent du seed. */
export const useUpdateTopicPictogram = (topicId: string) => useFeedback(useLibUpdateTopicPictogram(topicId), { error: () => t('workshop.pictogramError') })

/** Description dans une langue : l'atelier, les listes et la fiche sujet changent tout de suite. */
export const useUpdateTopicDescription = (topicId: string) =>
  useFeedback(useLibUpdateTopicDescription(topicId), {
    success: () => t('mobile.authoring.toast.descriptionSaved'),
    error: () => t('mobile.authoring.toast.descriptionFailed'),
  })

/** Titres par palier : l'atelier et la fiche sujet (onglet Progression) changent tout de suite. */
export const useUpdateTopicTitles = (topicId: string) =>
  useFeedback(useLibUpdateTopicTitles(topicId), { success: () => t('workshop.titlesSaved'), error: () => t('workshop.titlesError') })

export const usePublishTopic = (topicId: string) =>
  useFeedback(useLibPublishTopic(topicId), {
    success: () => t('workshop.published'),
    error: () => t('workshop.publishError'),
    description: () => t('workshop.publishErrorText'),
  })

export const useDraftTopic = (topicId: string) => useFeedback(useLibDraftTopic(topicId), { error: () => t('workshop.draftError') })

/* ───────────────────────── Questions ───────────────────────── */

/** Enregistre une question ; des signalements restés ouverts le disent en toast. */
export const useSaveQuestion = (topicId: string) =>
  useFeedback(useLibSaveQuestion(topicId), {
    success: (_variables, saved) => (saved.reportsResolved ? t('workshop.questionSaved') : undefined),
    error: () => t('workshop.questionError'),
  })

export const useModerateQuestion = (topicId: string) =>
  useFeedback(useLibModerateQuestion(topicId), {
    success: ({ decision }) => (decision === 'approve' ? t('workshop.approved') : t('workshop.rejected')),
    error: ({ decision }) => (decision === 'approve' ? t('workshop.approveError') : t('workshop.rejectError')),
  })

/** « Clore sans modifier » : les signalements ouverts de la question sont écartés. */
export const useDismissReports = (topicId: string) =>
  useFeedback(useLibDismissReports(topicId), { success: () => t('workshop.reportsClosed'), error: () => t('workshop.reportsCloseError') })

export const useDeleteQuestion = (topicId: string) => useFeedback(useLibDeleteQuestion(topicId), { error: () => t('workshop.questionDeleteError') })

export const useArchiveQuestion = (topicId: string) => useFeedback(useLibArchiveQuestion(topicId), { error: () => t('workshop.lifecycleError') })

/* ───────────────────────── Équipe ───────────────────────── */

export const useTeamChange = (topicId: string) =>
  useFeedback(useLibTeamChange(topicId), { error: () => t('workshop.teamError'), description: () => t('workshop.teamErrorText') })
