import { router } from 'expo-router'
import { BellIcon, ParallaxIconButton } from '@/design-system'
import { useUnreadCount } from '@/features/home/hooks/use-home'

/** Cloche posée sur l'image du Profil (`ParallaxIconButton`), avec le nombre de notifications non lues. */
export function ProfileNotificationButton() {
  const unread = useUnreadCount()
  return <ParallaxIconButton icon={BellIcon} label="Notifications" badge={unread.data?.count} onPress={() => router.push('/home/notifications')} />
}
