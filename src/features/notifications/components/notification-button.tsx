import { router } from 'expo-router'
import { NotificationBell } from '@/design-system'
import { useUnreadCount } from '@/features/home/hooks/use-home'

export function NotificationButton() {
  const unread = useUnreadCount()
  return <NotificationBell count={unread.data?.count} onPress={() => router.push('/home/notifications')} />
}
