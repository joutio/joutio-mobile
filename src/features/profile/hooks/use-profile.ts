import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/design-system'
import { useMe } from '@/features/me'
import { queryKeys } from '@/lib/query-keys'
import type { MeView, NotificationCategory, NotificationPreferenceView } from '@/shared/types/bff'
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
 * refuse ; la fiche publique est invalidée sans recharger l'écran courant.
 */
export function useUpdateMe<K extends MeField>(field: K) {
  const client = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: (value: MeView[K]) => SAVERS[field](userId, value as never),
    onMutate: async (value) => {
      await client.cancelQueries({ queryKey: queryKeys.me() })
      const previous = client.getQueryData<MeView>(queryKeys.me())
      if (previous) client.setQueryData<MeView>(queryKeys.me(), { ...previous, [field]: value })
      return { previous }
    },
    onError: (_error, _value, context) => {
      if (context?.previous) client.setQueryData(queryKeys.me(), context.previous)
      toast.error("La modification n'a pas été enregistrée", { description: 'Vérifie ta connexion, puis réessaie.' })
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.profiles.profile(userId), refetchType: 'none' })
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
    onMutate: async ({ category, enabled }) => {
      await client.cancelQueries({ queryKey: key })
      const previous = client.getQueryData<NotificationPreferenceView[]>(key)
      const others = (previous ?? []).filter((item) => item.category !== category)
      client.setQueryData<NotificationPreferenceView[]>(key, [...others, { category, enabled }])
      return { previous }
    },
    onError: (_error, _value, context) => {
      if (context?.previous) client.setQueryData(key, context.previous)
      toast.error("Le réglage n'a pas été enregistré", { description: 'Vérifie ta connexion, puis réessaie.' })
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
