import { router } from 'expo-router'
import { LightningIcon, showDialog } from '@/design-system'
import { usePremiumSheet } from '@/features/premium/premium-store'
import type { ApiError } from '@joutio/client-domain/api-types'

const CHALLENGE_QUOTA = 'urn:joutio:bff:challenge:quotaExceeded'
const ROOM_QUOTA = 'urn:joutio:bff:room:quotaExceeded'

/**
 * Limite atteinte (`defis.md` § 3) : `Dialog` Voir mes défis, Passer Premium, Fermer. Vrai si l'erreur était un
 * dépassement de quota (défis en attente ou salons ouverts), déjà affiché.
 */
export function showQuotaDialog(error: unknown): boolean {
  const type = (error as ApiError | undefined)?.type
  if (type !== CHALLENGE_QUOTA && type !== ROOM_QUOTA) return false
  const rooms = type === ROOM_QUOTA
  showDialog({
    title: rooms ? 'Limite de salons atteinte' : 'Limite de défis atteinte',
    message: rooms
      ? "Tu as atteint ta limite de salons ouverts. Ferme un salon avant d'en créer un autre."
      : "Tu as atteint ta limite de défis en attente. Termine ou annule un défi avant d'en lancer un autre.",
    icon: LightningIcon,
    tone: 'accent',
    actions: [
      { label: 'Voir mes défis', variant: 'filled', tone: 'accent', onPress: () => router.navigate('/challenges') },
      { label: 'Passer Premium', variant: 'tinted', tone: 'accent', onPress: () => usePremiumSheet.getState().show('quota') },
      { label: 'Fermer', variant: 'plain', tone: 'neutral' },
    ],
  })
  return true
}
