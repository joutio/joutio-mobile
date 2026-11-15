import { type TierCode } from '@/design-system'
import { currentLanguage, dayLabel as sharedDayLabel, formatDate, formatNumber as formatNumberIn, t, tierKey } from '@/lib/i18n'
import type { MasteryTier } from '@joutio/client/api-types'

/** `2 418` en français, `2,418` en anglais : langue courante de l'app. */
export const formatNumber = (value: number) => formatNumberIn(value, currentLanguage())

/** Seuils d'XP de maîtrise d'un sujet (`MasteryTier` de `joutio-profile-domain`) : conditions des titres verrouillés. */
export const MASTERY_XP: Record<MasteryTier, number> = {
  FER: 0,
  BRONZE: 500,
  ARGENT: 1_500,
  OR: 4_000,
  PLATINE: 9_000,
  EMERAUDE: 21_000,
  DIAMANT: 45_000,
}
export const MASTERY_TIERS = Object.keys(MASTERY_XP) as MasteryTier[]

/** Nom du palier dans la langue courante (`tokens.tier[*].label` reste le français du lab). */
export const tierLabel = (tier: TierCode) => t(tierKey(tier))

/** Légende du classement du mois : « XP gagnée en novembre · Mondial · remise à zéro le 1er décembre ». */
export function monthlyLegend(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const month = (date: Date) => formatDate(date, currentLanguage(), { month: 'long' })
  return t('mobile.rankings.monthlyLegend', { month: month(now), next: month(next) })
}

/** Jour d'un groupe de parties : Aujourd'hui, Hier, le nom du jour dans la semaine, puis « Dimanche 25 oct. ». */
export function dayLabel(date: Date, now = new Date()) {
  return sharedDayLabel(date, currentLanguage(), { today: t('topic.today'), yesterday: t('topic.yesterday') }, now)
}
