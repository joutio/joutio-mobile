import { router } from 'expo-router'
import {
  BellIcon,
  CheckIcon,
  FlagIcon,
  LightningIcon,
  NotificationRow,
  ShieldWarningIcon,
  SwordIcon,
  UserPlusIcon,
  WarningIcon,
  XIcon,
  type Icon,
} from '@/design-system'
import { duration } from '@/features/challenges/lib/challenges-service'
import { useAcceptChallenge } from '@/features/challenges/hooks/use-challenges'
import { useFollowPlayer, usePlayerProfile } from '@/features/social/hooks/use-social'
import type { NotificationView } from '@/lib/realtime/personal-notifications'
import type { ChallengeView } from '@/shared/types/bff'
import { avatarSvg } from '@/shared/utils/avatar'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { isExpired, isUnread, relativeTime } from '../lib/notifications-service'
import { useMarkRead, useDeleteNotification } from '../hooks/use-notifications'

/** Pictogramme des notifications sans joueur (système). */
const ICONS: Record<NotificationView['type'], Icon> = {
  FOLLOW: UserPlusIcon,
  CHALLENGE_RECEIVED: SwordIcon,
  CHALLENGE_DECLINED: XIcon,
  ROOM_ACCEPTED: CheckIcon,
  WIZZ: LightningIcon,
  QUESTION_REPORTED: FlagIcon,
  TOPIC_DRAFTED: WarningIcon,
  ACCOUNT_SUSPENDED: ShieldWarningIcon,
}

/** Libellés de `joutio-web` (`notifications.row`). */
function titleOf(notification: NotificationView, name: string) {
  switch (notification.type) {
    case 'FOLLOW':
      return `${name} s'est abonné à toi`
    case 'CHALLENGE_RECEIVED':
      return notification.gameId ? `${name} te demande une revanche` : `${name} te défie`
    case 'CHALLENGE_DECLINED':
      return `${name} a refusé ton défi`
    case 'ROOM_ACCEPTED':
      return `${name} a accepté ton défi`
    case 'WIZZ':
      return `${name} te demande de rejoindre la salle`
    case 'QUESTION_REPORTED':
      return `${name} a signalé une question d'un de tes sujets`
    case 'TOPIC_DRAFTED':
      return 'Ton sujet est repassé en brouillon'
    case 'ACCOUNT_SUSPENDED':
      return 'Ton compte a été suspendu'
    default:
      return 'Notification'
  }
}

/** Cible au toucher, comme `notificationTargetPath` de `joutio-web`. */
function open(notification: NotificationView) {
  switch (notification.type) {
    case 'FOLLOW':
      if (notification.actorId) router.push({ pathname: '/home/player/[id]', params: { id: notification.actorId } })
      return
    case 'CHALLENGE_RECEIVED':
      router.navigate('/challenges')
      return
    case 'ROOM_ACCEPTED':
      if (notification.gameId) router.push({ pathname: '/duel/[gameId]', params: { gameId: notification.gameId } })
      else if (notification.sourceId) router.push({ pathname: '/room/[roomId]', params: { roomId: notification.sourceId } })
      return
    case 'WIZZ':
      if (notification.sourceId && !isExpired(notification)) router.push({ pathname: '/room/[roomId]', params: { roomId: notification.sourceId } })
      return
    case 'QUESTION_REPORTED':
    case 'TOPIC_DRAFTED':
      if (notification.topicId) router.push({ pathname: '/home/topic/[id]', params: { id: notification.topicId } })
      return
  }
}

/**
 * Une notification : joueur à l'origine (fiche en cache), titre et contexte ; Jouer sur un défi reçu encore ouvert,
 * Suivre sur un nouvel abonné. Toucher marque comme lue puis ouvre la cible ; balayer supprime.
 */
export function NotificationItem({ notification, challenge, last }: { notification: NotificationView; challenge: ChallengeView | undefined; last: boolean }) {
  const actor = usePlayerProfile(notification.actorId ?? '', Boolean(notification.actorId))
  const read = useMarkRead()
  const remove = useDeleteNotification()
  const accept = useAcceptChallenge()
  const follow = useFollowPlayer(notification.actorId ?? '')
  const profile = actor.data
  const name = profile?.pseudonym ?? 'Un joueur'
  const unread = isUnread(notification)
  const now = Date.now()
  const pending = notification.type === 'CHALLENGE_RECEIVED' && challenge?.status === 'PENDING' && !isExpired(notification, now)
  const sub =
    notification.type === 'CHALLENGE_RECEIVED' && challenge
      ? `${topicName(challenge.topic.names)} · ${pending ? `expire dans ${duration(Date.parse(challenge.expiresAt) - now)}` : relativeTime(notification.createdAt, now)}`
      : relativeTime(notification.createdAt, now)
  const markRead = () => unread && read.mutate(notification.notificationId)

  return (
    <NotificationRow
      title={titleOf(notification, name)}
      sub={sub}
      icon={notification.actorId ? undefined : (ICONS[notification.type] ?? BellIcon)}
      player={
        notification.actorId
          ? {
              name,
              src: profile ? (avatarSvg(profile.avatarOptions, profile.userId) ?? undefined) : undefined,
              tier: profile?.progression && !profile.progression.provisional ? tierOf(profile.progression.rating) : undefined,
            }
          : undefined
      }
      unread={unread}
      cta={
        pending && challenge
          ? {
              label: 'Jouer',
              loading: accept.isPending,
              onPress: () => {
                markRead()
                accept.mutate(challenge)
              },
            }
          : notification.type === 'FOLLOW' && profile && !profile.isMe
            ? {
                label: profile.following ? 'Suivi' : 'Suivre',
                variant: profile.following ? 'gray' : 'tinted',
                loading: follow.isPending,
                onPress: () => follow.mutate(!profile.following),
              }
            : undefined
      }
      onPress={() => {
        markRead()
        open(notification)
      }}
      onDelete={() => remove.mutate(notification.notificationId)}
      last={last}
    />
  )
}
