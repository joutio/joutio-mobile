import { HeartIcon, showDialog } from '@/design-system'

/**
 * Ne plus suivre un joueur se confirme, comme un sujet : on évite les allers-retours en rafale (et les notifications
 * d'abonné qui vont avec).
 */
export function confirmUnfollow(pseudonym: string, onConfirm: () => void) {
  showDialog({
    title: `Ne plus suivre ${pseudonym} ?`,
    message: 'Son profil quittera tes abonnements dans Social.',
    icon: HeartIcon,
    tone: 'danger',
    sheet: true,
    actions: [
      { label: 'Ne plus suivre', tone: 'destructive', onPress: onConfirm },
      { label: 'Annuler', variant: 'plain' },
    ],
  })
}
