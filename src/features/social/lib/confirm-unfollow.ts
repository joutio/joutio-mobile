import { HeartIcon, showDialog } from '@/design-system'
import { t } from '@/lib/i18n'

/**
 * Ne plus suivre un joueur se confirme, comme un sujet : on évite les allers-retours en rafale (et les notifications
 * d'abonné qui vont avec).
 */
export function confirmUnfollow(pseudonym: string, onConfirm: () => void) {
  showDialog({
    title: t('topic.unfollowTitle', { name: pseudonym }),
    message: t('mobile.social.unfollowText'),
    icon: HeartIcon,
    tone: 'danger',
    sheet: true,
    actions: [
      { label: t('topic.unfollow'), tone: 'destructive', onPress: onConfirm },
      { label: t('topic.cancel'), variant: 'plain' },
    ],
  })
}
