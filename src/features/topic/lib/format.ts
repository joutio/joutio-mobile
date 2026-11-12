import { tokens, type TierCode } from '@/design-system'
import type { MasteryTier } from '@joutio/client-domain/api-types'

const NUMBER = new Intl.NumberFormat('fr-FR')
/** `2 418`, avec l'espace fine du français. */
export const formatNumber = (value: number) => NUMBER.format(value)

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

export const tierLabel = (tier: TierCode) => tokens.tier[tier].label

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long' })
/** Légende du classement du mois : « XP gagnée en novembre · Mondial · remise à zéro le 1er décembre ». */
export function monthlyLegend(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `Points d'expérience gagnés en ${MONTH.format(now)} · Mondial · remise à zéro le 1er ${MONTH.format(next)}`
}

const WEEKDAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })
const LONG_DAY = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

/** Jour d'un groupe de parties : Aujourd'hui, Hier, le nom du jour dans la semaine, puis « Dimanche 25 oct. ». */
export function dayLabel(date: Date, now = new Date()) {
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const days = Math.round((start(now) - start(date)) / 86_400_000)
  if (days <= 0) return "Aujourd'hui"
  if (days === 1) return 'Hier'
  if (days < 7) return capitalize(WEEKDAY.format(date))
  return capitalize(LONG_DAY.format(date))
}
