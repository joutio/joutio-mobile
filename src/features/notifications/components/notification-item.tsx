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
  toast,
} from '@/design-system'
import { useRemoveNotification, type NotificationView } from '@joutio/client/notifications'
import { useProfile } from '@joutio/client/profile'
import type { RoomView } from '@joutio/client/rooms'
import { duration } from '@/features/challenges/lib/duration'
import { avatarSvg } from '@/shared/utils/avatar'
import { tierOf } from '@/shared/utils/tier'
import { topicName } from '@/shared/utils/topic-name'
import { useMyTopics } from '@/features/authoring/hooks/use-authoring'
import { notificationTitle } from '../lib/notification-presentation'
import { useOpenNotification } from '../hooks/use-open-notification'
import { opensScreen } from '../lib/notification-target'
import { isExpired, isUnread, relativeTime } from '../lib/notification-format'
import { useT } from '@/lib/i18n'

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
export function NotificationItem({ notification, room, last }: { notification: NotificationView; room: RoomView | undefined; last: boolean }) {
  const t = useT()
  // Un signalement reste anonyme : jamais le nom ni l'avatar du signalant, même si une ancienne notification le portait.
  const anonymous = notification.type === 'QUESTION_REPORTED'
  const actorId = anonymous ? null : notification.actorId
  const actor = useProfile(actorId ?? undefined)
  const reportedTopic = useMyTopics().data?.content.find((topic) => topic.topicId === notification.topicId)
  const open = useOpenNotification()
  const remove = useRemoveNotification()
  const profile = actor.data
  const name = profile?.pseudonym ?? t('notifications.somePlayer')
  const unread = isUnread(notification)
  const now = Date.now()
  const pending = notification.type === 'CHALLENGE_RECEIVED' && room?.status === 'INVITED' && !isExpired(notification, now)
  const sub =
    notification.type === 'CHALLENGE_RECEIVED' && room
      ? t('common.dotPair', {
          a: topicName(room.topic.names),
          b: pending ? t('challenges.expiresIn', { duration: duration(Date.parse(room.expiresAt) - now) }) : relativeTime(notification.createdAt, now),
        })
      : anonymous && reportedTopic
        ? t('common.dotPair', { a: topicName(reportedTopic.names), b: relativeTime(notification.createdAt, now) })
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
              tier: profile?.progression ? tierOf(profile.progression.rating) : undefined,
            }
          : undefined
      }
      unread={unread}
      chevron={opensScreen(notification.type)}
      onPress={() => {
        void open(notification)
      }}
      onDelete={() =>
        remove.mutate(notification.notificationId, { onError: () => toast.error(t('notifications.deleteError'), { description: t('home.errorText') }) })
      }
      last={last}
    />
  )
}
