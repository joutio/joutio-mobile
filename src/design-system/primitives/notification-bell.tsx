import { BellIcon } from '../icons'
import { IconButton } from './icon-button'

export interface NotificationBellProps {
  count?: number
  onPress: () => void
}
/** One visual and accessible count convention for every application header. */
export function NotificationBell({ count = 0, onPress }: NotificationBellProps) {
  return <IconButton icon={BellIcon} label="Notifications" variant="plain" tone="neutral" badge={count > 0 ? count : undefined} onPress={onPress} />
}
