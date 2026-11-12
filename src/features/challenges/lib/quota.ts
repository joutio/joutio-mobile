import { router } from 'expo-router'
import { LightningIcon, showDialog } from '@/design-system'
import { usePremiumSheet } from '@/features/premium/premium-store'
import type { MeView } from '@joutio/client-domain/api-types'
import { planLimits, problemLimit, quotaProblemOf } from '@joutio/client-domain/premium'

/**
 * Limite atteinte (`defis.md` § 3) : `Dialog` Voir mes défis, Passer Premium (sans Premium), Fermer. La limite vient de
 * l'erreur, sinon de `MeView.limits`. Vrai si l'erreur était un dépassement de quota (défis en attente ou salons
 * ouverts), déjà affiché.
 */
export function showQuotaDialog(error: unknown, me?: Pick<MeView, 'premium' | 'limits'> | null): boolean {
  const problem = quotaProblemOf(error)
  if (problem !== 'challenges' && problem !== 'rooms') return false
  const rooms = problem === 'rooms'
  const limits = planLimits(me)
  const limit = problemLimit(error) ?? (rooms ? limits.openRooms : limits.pendingChallenges)
  showDialog({
    title: rooms ? 'Limite de salons atteinte' : 'Limite de défis atteinte',
    message: rooms
      ? `Tu as atteint ta limite de ${limit} salons ouverts. Ferme un salon avant d'en créer un autre.`
      : `Tu as atteint ta limite de ${limit} défis en attente. Termine ou annule un défi avant d'en lancer un autre.`,
    icon: LightningIcon,
    tone: 'accent',
    actions: [
      { label: 'Voir mes défis', variant: 'filled', tone: 'accent', onPress: () => router.navigate('/challenges') },
      ...(me?.premium
        ? []
        : [{ label: 'Passer Premium', variant: 'tinted' as const, tone: 'accent' as const, onPress: () => usePremiumSheet.getState().show('quota') }]),
      { label: 'Fermer', variant: 'plain', tone: 'neutral' },
    ],
  })
  return true
}
