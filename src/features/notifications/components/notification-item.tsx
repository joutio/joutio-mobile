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
import { usePlayerProfile } from '@/features/social/hooks/use-social'
import type { NotificationView } from '@/lib/realtime/personal-notifications'
import type { ChallengeView } from '@joutio/client-domain/api-types'
import { avatarSvg } from '@/shared/utils/avatar'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { useMyTopics } from '@/features/authoring/hooks/use-authoring'
import { notificationTitle } from '../lib/notification-presentation'
import { useOpenNotification } from '../hooks/use-open-notification'
import { isExpired, isUnread, relativeTime } from '../lib/notifications-service'
import { useDeleteNotification } from '../hooks/use-notifications'

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

/**
 * Une notification : joueur à l'origine (fiche en cache), titre et contexte. Toucher marque comme lue puis ouvre
 * l'écran de l'action ; balayer supprime.
 */
export function NotificationItem({ notification, challenge, last }: { notification: NotificationView; challenge: ChallengeView | undefined; last: boolean }) {
  // Un signalement reste anonyme : jamais le nom ni l'avatar du signalant, même si une ancienne notification le portait.
  const anonymous = notification.type === 'QUESTION_REPORTED'
  const actorId = anonymous ? null : notification.actorId
  const actor = usePlayerProfile(actorId ?? '', Boolean(actorId))
  const reportedTopic = useMyTopics(anonymous).data?.content.find((topic) => topic.topicId === notification.topicId)
  const open = useOpenNotification()
  const remove = useDeleteNotification()
  const profile = actor.data
  const name = profile?.pseudonym ?? 'Un joueur'
  const unread = isUnread(notification)
  const now = Date.now()
  const pending = notification.type === 'CHALLENGE_RECEIVED' && challenge?.status === 'PENDING' && !isExpired(notification, now)
  const sub =
    notification.type === 'CHALLENGE_RECEIVED' && challenge
      ? `${topicName(challenge.topic.names)} · ${pending ? `expire dans ${duration(Date.parse(challenge.expiresAt) - now)}` : relativeTime(notification.createdAt, now)}`
      : anonymous && reportedTopic
        ? `${topicName(reportedTopic.names)} · ${relativeTime(notification.createdAt, now)}`
        : relativeTime(notification.createdAt, now)

  return (
    <NotificationRow
      title={notificationTitle(notification, name)}
      sub={sub}
      icon={actorId ? undefined : (ICONS[notification.type] ?? BellIcon)}
      player={
        actorId
          ? {
              name,
              src: profile ? (avatarSvg(profile.avatarOptions, profile.userId) ?? undefined) : undefined,
              tier: profile?.progression && !profile.progression.provisional ? tierOf(profile.progression.rating) : undefined,
            }
          : undefined
      }
      unread={unread}
      onPress={() => {
        void open(notification)
      }}
      onDelete={() => remove.mutate(notification.notificationId)}
      last={last}
    />
  )
}
