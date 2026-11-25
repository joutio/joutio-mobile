import { router } from '@/shared/navigation/router'
import { LightningIcon, showDialog } from '@/design-system'
import { usePremiumSheet } from '@/features/premium/premium-store'
import type { MeView } from '@joutio/client/me'
import { planLimits, problemLimit, quotaProblemOf } from '@joutio/client/premium'
import { t } from '@/lib/i18n'

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
    title: rooms ? t('play.roomQuotaTitle') : t('play.challengeQuotaTitle'),
    message: rooms ? t('play.roomQuotaText', { limit }) : t('play.challengeQuotaText', { limit }),
    icon: LightningIcon,
    tone: 'accent',
    actions: [
      {
        label: t('play.seeChallenges'),
        variant: 'filled',
        tone: 'accent',
        onPress: () => router.navigate({ pathname: '/challenges', params: { tab: 'sent' } }),
      },
      ...(me?.premium
        ? []
        : [{ label: t('play.goPremium'), variant: 'tinted' as const, tone: 'accent' as const, onPress: () => usePremiumSheet.getState().show('quota') }]),
      { label: t('play.close'), variant: 'plain', tone: 'neutral' },
    ],
  })
  return true
}
