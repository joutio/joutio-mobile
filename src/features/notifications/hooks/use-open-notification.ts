import { router } from '@/shared/navigation/router'
import { useCallback } from 'react'
import { toast } from '@/design-system'
import { clearSession, getUserId } from '@/lib/auth'
import { useSessionStore } from '@/features/auth/session-store'
import { notificationTarget, type NotificationLink } from '../lib/notification-target'
import { notificationsService } from '../lib/notifications-service'
import { useMarkRead } from './use-notifications'

/** Une seule action d'ouverture, quel que soit le point d'entrée. */
export function useOpenNotification() {
  const read = useMarkRead()
  const markRead = read.mutate
  return useCallback(
    async (notice: NotificationLink, recipient = getUserId()) => {
      if (!recipient || recipient !== getUserId() || !useSessionStore.getState().authenticated) return
      const target = notificationTarget(notice)
      markRead(notice.notificationId)
      if (target.kind === 'none') return
      const fallback = (message: string) => {
        if (target.kind === 'fallback' && target.challenges) router.navigate({ pathname: '/challenges', params: { tab: target.challenges } })
        else router.navigate('/home/notifications')
        toast.info(message)
      }
      let resolved: { questionId?: string } = {}
      try {
        resolved = (await notificationsService.checkTarget(target)) ?? {}
      } catch (error) {
        if (recipient !== getUserId() || !useSessionStore.getState().authenticated) return
        const status = (error as { statusCode?: number }).statusCode
        fallback(
          status === 403 || status === 404 || status === 410
            ? 'Ce contenu n’est plus disponible'
            : 'Impossible d’ouvrir cette notification. Réessaie après avoir vérifié ta connexion.',
        )
        return
      }
      if (recipient !== getUserId() || !useSessionStore.getState().authenticated) return
      switch (target.kind) {
        case 'player':
          router.push({ pathname: '/home/player/[id]', params: { id: target.id } })
          break
        case 'challenges':
          router.navigate({ pathname: '/challenges', params: { tab: target.tab } })
          break
        case 'room':
          router.push({ pathname: '/room/[roomId]', params: { roomId: target.id, fromPush: '1' } })
          break
        // Tâches ciblées (`navigation.md`) : poussées par-dessus l'écran courant, hors onglets ; le retour y revient.
        case 'moderation':
          if (target.reportId && resolved.questionId)
            router.push({
              pathname: '/workshop/[id]/reports/[questionId]',
              params: { id: target.id, questionId: resolved.questionId, highlight: target.reportId, from: 'notifications' },
            })
          else router.push({ pathname: '/workshop/[id]/moderation', params: { id: target.id, tab: 'reports' } })
          break
        case 'edit-topic':
          router.push({ pathname: '/workshop/[id]', params: { id: target.id } })
          break
        case 'suspended':
          await clearSession('suspended')
          break
        case 'fallback':
          fallback(target.expired ? 'Cette invitation a expiré' : 'Cette notification n’est plus disponible')
          break
      }
    },
    [markRead],
  )
}
