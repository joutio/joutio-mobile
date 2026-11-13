import { PSEUDONYM_PROBLEMS, pseudonymIssue, pseudonymKey, type PseudonymIssue } from '@joutio/client-domain/profile'
import { useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { optimisticUpdate } from '@/lib/optimistic-cache'
import { queryKeys } from '@/lib/query-keys'
import type {
  ApiError,
  HomeView,
  MeView,
  PlayerProfileView,
  PageResponse,
  PlayerCardView,
  ChallengeView,
  NotificationCategory,
  NotificationPreferenceView,
} from '@joutio/client-domain/api-types'
import { profileService } from '../lib/profile-service'

const useUserId = () => useMe(true).data?.userId ?? ''

/** Collection de badges du joueur connecté. */
export function useMyBadges(enabled = true) {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.profiles.badges(userId),
    queryFn: () => profileService.badges(userId),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
  })
}

/** Série et jours joués sur 365 jours. */
export function useMyActivity(enabled = true) {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.profiles.activity(userId),
    queryFn: () => profileService.activity(userId),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
  })
}

/** Sujets joués (donut et maîtrise par sujet). */
export function useMyTopics(enabled = true) {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.profiles.topics(userId),
    queryFn: () => profileService.topics(userId),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
  })
}

/** Catalogue des récompenses (styles d'avatar). */
export function useMyRewards(enabled = true) {
  return useQuery({ queryKey: queryKeys.rewards(), queryFn: profileService.rewards, enabled, staleTime: 60_000 })
}

type MeField = 'pseudonym' | 'bio' | 'country' | 'bannerUrl' | 'language' | 'avatarOptions' | 'interests'

const SAVERS: { [K in MeField]: (userId: string, value: NonNullable<MeView[K]> | null) => Promise<void> } = {
  pseudonym: (userId, value) => profileService.pseudonym(userId, value ?? ''),
  bio: (userId, value) => profileService.bio(userId, value ?? ''),
  country: (userId, value) => profileService.country(userId, value),
  bannerUrl: (userId, value) => profileService.banner(userId, value),
  language: (userId, value) => profileService.language(userId, value ?? 'fr'),
  avatarOptions: (userId, value) => profileService.avatarOptions(userId, value),
  interests: (_userId, value) => profileService.interests(value ?? []),
}

/**
 * Modifie un champ du profil : `me` est mis à jour sur place (le Profil et les Réglages le lisent), restauré si le BFF
 * refuse ; la fiche publique et les listes connues suivent la même transaction optimiste.
 */
export function useUpdateMe<K extends MeField>(field: K) {
  const client = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (value: MeView[K]) => SAVERS[field](userId, value as never),
    onMutate: (value) =>
      optimisticUpdate(client, [queryKeys.me(), queryKeys.profiles.profile(userId), ['contacts'], queryKeys.challenges(), queryKeys.home()], () => {
        client.setQueryData<MeView>(queryKeys.me(), (me) => (me ? { ...me, [field]: value } : me))
        // Rail « Selon tes centres d'intérêt » de l'Accueil : un univers retiré sort aussitôt de la sélection. Les sujets
        // d'un univers ajouté sont calculés par le BFF et arrivent avec la relecture suivante de l'Accueil.
        if (field === 'interests') {
          const interests = (value as string[] | null) ?? []
          client.setQueryData<HomeView>(queryKeys.home(), (home) =>
            home
              ? { ...home, recommendedTopics: (home.recommendedTopics ?? []).filter((topic) => topic.category !== null && interests.includes(topic.category)) }
              : home,
          )
        }
        if (field !== 'interests')
          client.setQueryData<PlayerProfileView>(queryKeys.profiles.profile(userId), (profile) => (profile ? { ...profile, [field]: value } : profile))
        if (field === 'pseudonym' || field === 'avatarOptions') {
          client.setQueriesData<InfiniteData<PageResponse<PlayerCardView>>>({ queryKey: ['contacts'] }, (data) =>
            data
              ? {
                  ...data,
                  pages: data.pages.map((page) => ({
                    ...page,
                    content: page.content.map((player) => (player.userId === userId ? { ...player, [field]: value } : player)),
                  })),
                }
              : data,
          )
          client.setQueryData<ChallengeView[]>(queryKeys.challenges(), (items) =>
            items?.map((challenge) => ({
              ...challenge,
              challenger: challenge.challenger.userId === userId ? { ...challenge.challenger, [field]: value } : challenge.challenger,
              opponent: challenge.opponent.userId === userId ? { ...challenge.opponent, [field]: value } : challenge.opponent,
            })),
          )
        }
      }),
    onError: (error, _value, context) => {
      context?.rollback()
      const type = (error as ApiError | undefined)?.type
      if (field === 'pseudonym' && type === PSEUDONYM_PROBLEMS.taken) {
        toast.error('Ce pseudonyme est déjà pris.')
        return
      }
      if (field === 'pseudonym' && type === PSEUDONYM_PROBLEMS.invalid) {
        toast.error(PSEUDONYM_RULES)
        return
      }
      toast.error("La modification n'a pas été enregistrée", { description: 'Vérifie ta connexion, puis réessaie.' })
    },
  })
}

/** Préférences de notification persistées (`FOLLOW|ROOM|QUESTION`). */
export function useNotificationPreferences() {
  return useQuery({ queryKey: queryKeys.notificationPreferences(), queryFn: profileService.notificationPreferences, staleTime: 60_000 })
}

export function useSetNotificationPreference() {
  const client = useQueryClient()
  const key = queryKeys.notificationPreferences()
  return useMutation({
    mutationFn: ({ category, enabled }: { category: NotificationCategory; enabled: boolean }) => profileService.setNotificationPreference(category, enabled),
    onMutate: ({ category, enabled }) =>
      optimisticUpdate(client, [key], () => {
        client.setQueryData<NotificationPreferenceView[]>(key, (items) => [
          ...(items ?? []).filter((item) => item.category !== category),
          { category, enabled },
        ])
      }),
    onError: (_error, _value, context) => {
      context?.rollback()
      toast.error("Le réglage n'a pas été enregistré")
    },
  })
}

/** Code de suppression envoyé par e-mail. */
export function useRequestDeletionCode() {
  return useMutation({ mutationFn: profileService.requestDeletionCode })
}

/** Suppression définitive du compte (code à 6 chiffres). */
export function useDeleteAccount() {
  return useMutation({ mutationFn: (code: string) => profileService.deleteAccount(code) })
}

export const PSEUDONYM_RULES = '3 à 20 caractères : lettres sans accent, chiffres ou _, en commençant par une lettre.'

/** État de saisie du pseudonyme : règles locales immédiates, unicité vérifiée par le BFF après une courte pause. */
export type PseudonymCheck = { state: 'unchanged' | 'checking' | 'available' | 'taken' } | { state: 'invalid'; issue: PseudonymIssue }

const PSEUDONYM_CHECK_DELAY_MS = 350

export function usePseudonymCheck(value: string, current: string | undefined): PseudonymCheck {
  const trimmed = value.trim()
  const unchanged = trimmed === (current ?? '')
  const issue = unchanged ? null : pseudonymIssue(trimmed)
  const [debounced, setDebounced] = useState(trimmed)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), PSEUDONYM_CHECK_DELAY_MS)
    return () => clearTimeout(timer)
  }, [trimmed])
  const settled = debounced === trimmed
  const query = useQuery({
    queryKey: queryKeys.pseudonymAvailability(pseudonymKey(debounced)),
    queryFn: () => profileService.pseudonymAvailability(debounced),
    enabled: !unchanged && issue === null && settled,
    staleTime: 10_000,
  })
  if (unchanged) return { state: 'unchanged' }
  if (issue) return { state: 'invalid', issue }
  if (!settled || query.isPending || query.isFetching) return { state: 'checking' }
  if (query.data && !query.data.valid) return { state: 'invalid', issue: 'characters' }
  // Vérification indisponible : le serveur tranche à l'enregistrement.
  return query.data?.available === false ? { state: 'taken' } : { state: 'available' }
}
