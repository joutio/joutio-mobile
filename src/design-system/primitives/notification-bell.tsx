import { BellIcon } from '../icons'
import { IconButton } from './icon-button'
import { useT } from '@/lib/i18n'

export interface NotificationBellProps {
  count?: number
  onPress: () => void
}
/** One visual and accessible count convention for every application header. */
export function NotificationBell({ count = 0, onPress }: NotificationBellProps) {
  const t = useT()
  return <IconButton icon={BellIcon} label={t('home.notifications')} variant="plain" tone="neutral" badge={count > 0 ? count : undefined} onPress={onPress} />
}
