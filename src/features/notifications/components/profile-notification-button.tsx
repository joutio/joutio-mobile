import { router } from 'expo-router'
import { BellIcon, ParallaxIconButton } from '@/design-system'
import { useUnreadCount } from '@joutio/client/notifications'
import { useT } from '@/lib/i18n'

/** Cloche posée sur l'image du Profil (`ParallaxIconButton`), avec le nombre de notifications non lues. */
export function ProfileNotificationButton() {
  const t = useT()
  const unread = useUnreadCount()
  return <ParallaxIconButton icon={BellIcon} label={t('home.notifications')} badge={unread.data?.count} onPress={() => router.push('/home/notifications')} />
}
