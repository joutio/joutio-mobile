import { useReadNotification } from '@joutio/client/notifications'
import { useCallback } from 'react'
import { toast } from '@/design-system'
import { useSessionStore } from '@/features/auth/session-store'
import { clearSession, getUserId } from '@/lib/auth'
import { router } from '@/shared/navigation/router'
import { notificationTarget, type NotificationLink } from '../lib/notification-target'
import { useT } from '@/lib/i18n'

/**
 * Une seule action d'ouverture, quel que soit le point d'entrée. La cible s'ouvre tout de suite : un contenu disparu
 * s'affiche dans l'écran visé (son propre état d'erreur), jamais par une lecture préalable.
 */
export function useOpenNotification() {
  const t = useT()
  const { mutate: markRead } = useReadNotification()
  return useCallback(
    async (notice: NotificationLink, recipient = getUserId()) => {
      if (!recipient || recipient !== getUserId() || !useSessionStore.getState().authenticated) return
      const target = notificationTarget(notice)
      markRead(notice.notificationId)
      switch (target.kind) {
        case 'none':
          return
        case 'player':
          router.push({ pathname: '/home/player/[id]', params: { id: target.id } })
          return
        case 'challenges':
          router.navigate({ pathname: '/challenges', params: { tab: target.tab } })
          return
        case 'room':
          router.push({ pathname: '/room/[roomId]', params: { roomId: target.id, fromPush: '1' } })
          return
        // Tâches ciblées (`navigation.md`) : poussées par-dessus l'écran courant, hors onglets ; le retour y revient.
        case 'moderation':
          if (target.reportId)
            router.push({ pathname: '/workshop/[id]/report/[reportId]', params: { id: target.id, reportId: target.reportId, from: 'notifications' } })
          else router.push({ pathname: '/workshop/[id]/moderation', params: { id: target.id, tab: 'reports' } })
          return
        case 'edit-topic':
          router.push({ pathname: '/workshop/[id]', params: { id: target.id } })
          return
        case 'suspended':
          await clearSession('suspended')
          return
        case 'fallback':
          if (target.challenges) router.navigate({ pathname: '/challenges', params: { tab: target.challenges } })
          else router.navigate('/home/notifications')
          toast.info(target.expired ? t('notifications.expired') : t('mobile.notifications.gone'))
      }
    },
    [markRead, t],
  )
}
