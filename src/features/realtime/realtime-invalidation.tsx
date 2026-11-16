import { useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useMe } from '@/features/me'
import { queryKeys } from '@/lib/query-keys'
import type { NotificationView } from '@/lib/realtime/personal-notifications'
import { subscribeStomp } from '@/lib/ws'

/**
 * Vues relues quand le serveur pousse un événement **d'un autre acteur** sur le flux personnel (2026-11-16, comme le
 * web). La règle des mutations reste : une commande locale est optimiste et ne relit rien ; mais un événement du bus
 * (abonné, défi, signalement, sujet repassé en brouillon, déblocage…) change des données que le joueur n'a pas écrites,
 * et les vues qui en dépendent suivent sans tirer pour rafraîchir. Une seule table : chaque type dit ce qu'il touche.
 */
const PERSONAL: Record<NotificationView['type'], (notification: NotificationView) => QueryKey[]> = {
  // Compteur d'abonnés, listes Abonnés, fiche de l'abonné.
  FOLLOW: (notification) => [queryKeys.me(), queryKeys.contacts.all(), ...(notification.actorId ? [queryKeys.profiles.all(notification.actorId)] : [])],
  CHALLENGE_RECEIVED: () => [queryKeys.challenges()],
  CHALLENGE_DECLINED: () => [queryKeys.challenges(), queryKeys.rooms()],
  // Défi accepté : sa salle apparaît, la partie suivra.
  ROOM_ACCEPTED: (notification) => [
    queryKeys.challenges(),
    queryKeys.rooms(),
    queryKeys.games.activeAll(),
    ...(notification.sourceId ? [queryKeys.room(notification.sourceId)] : []),
  ],
  WIZZ: () => [queryKeys.rooms()],
  // Signalement d'une question d'un de mes sujets : À traiter, file des signalements, compteurs des questions.
  QUESTION_REPORTED: (notification) => [
    queryKeys.authoring.todo(),
    queryKeys.authoring.topics(),
    ...(notification.topicId ? [queryKeys.authoring.reports(notification.topicId), queryKeys.authoring.questions(notification.topicId)] : []),
  ],
  // Sujet repassé en brouillon (moins de 7 questions jouables) : atelier, fiche, catalogue, accueil.
  TOPIC_DRAFTED: (notification) => [
    queryKeys.authoring.topics(),
    queryKeys.authoring.created(),
    queryKeys.authoring.todo(),
    queryKeys.topics.all(),
    queryKeys.home(),
    ...(notification.topicId ? [queryKeys.authoring.workshop(notification.topicId), queryKeys.topic.all(notification.topicId)] : []),
  ],
  ACCOUNT_SUSPENDED: () => [queryKeys.me()],
}

/** Déblocage poussé sur `/topic/achievements/{userId}` (`AchievementView` du BFF). */
interface Achievement {
  kind?: 'BADGE' | 'TITLE'
  topicId?: string | null
}

/** Vues relues après une **re**connexion (retour au premier plan) : le flux personnel n'a pas d'historique. */
const RESYNC = (): QueryKey[] => [queryKeys.me(), queryKeys.notifications.all(), queryKeys.challenges(), queryKeys.rooms(), queryKeys.authoring.todo()]

interface Envelope {
  eventType?: string
  payload?: NotificationView
}

/** Monté une fois dans le layout `(app)`. */
export function RealtimeInvalidation() {
  const client = useQueryClient()
  const userId = useMe(true).data?.userId

  useEffect(() => {
    if (!userId) return
    const invalidate = (keys: readonly QueryKey[]) => keys.forEach((queryKey) => void client.invalidateQueries({ queryKey }))
    let connected = false

    const offPersonal = subscribeStomp(
      `/topic/notifications/${userId}`,
      (message) => {
        let envelope: Envelope
        try {
          envelope = JSON.parse(message.body) as Envelope
        } catch {
          return
        }
        const notification = envelope.payload
        if (!notification?.notificationId || envelope.eventType === 'NOTIFICATION_DELETED') return
        invalidate(PERSONAL[notification.type]?.(notification) ?? [])
      },
      () => {
        if (connected) invalidate(RESYNC())
        connected = true
      },
    )

    const offAchievements = subscribeStomp(`/topic/achievements/${userId}`, (message) => {
      let achievement: Achievement
      try {
        achievement = JSON.parse(message.body) as Achievement
      } catch {
        return
      }
      // Badge ou titre débloqué : profil, collection, titres, récompenses ; maîtrise du sujet pour un titre.
      invalidate([
        queryKeys.me(),
        queryKeys.rewards(),
        queryKeys.profiles.all(userId),
        ...(achievement.kind === 'TITLE' && achievement.topicId ? [queryKeys.topic.all(achievement.topicId)] : []),
      ])
    })

    return () => {
      offPersonal()
      offAchievements()
    }
  }, [client, userId])

  return null
}
