import { tokens, type StreakCalendarProps, type StreakDay, type TierCode } from '@/design-system'
import type { ActivityView, BadgeCollectionView } from '@/shared/types/bff'

const MONTH = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })

/** `YYYY-MM-DD` d'une date locale (fuseau de l'appareil, celui de l'activité du profil). */
export const isoDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/** Lundi = 0. */
const weekday = (date: Date) => (date.getDay() + 6) % 7

const playedDays = (activity: ActivityView | undefined) => new Set((activity?.days ?? []).filter((day) => day.games > 0).map((day) => day.date))

/**
 * Semaine en cours, du lundi au dimanche. Un jour passé sans duel n'est « manqué » qu'après un premier jour joué de
 * la fenêtre : un nouveau joueur ne voit pas de croix.
 */
export function weekOf(activity: ActivityView | undefined, now = new Date()): StreakDay[] {
  const played = playedDays(activity)
  const first = [...played].sort()[0]
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday(now))
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index)
    const key = isoDay(day)
    const today = key === isoDay(now)
    if (played.has(key)) return 'done'
    if (today) return 'today'
    if (day > now) return 'future'
    return first && key > first ? 'missed' : 'future'
  })
}

export const playedToday = (activity: ActivityView | undefined, now = new Date()) => playedDays(activity).has(isoDay(now))

/** Phrase sous le compteur : ce qu'il faut faire aujourd'hui, ou le record une fois la journée comptée. */
export function streakHint(activity: ActivityView | undefined, now = new Date()) {
  const count = activity?.currentStreak ?? 0
  if (count === 0) return "Joue un duel aujourd'hui pour lancer ta série"
  if (!playedToday(activity, now)) return `Joue un duel aujourd'hui pour passer à ${count + 1}`
  return `Record ${activity?.longestStreak ?? count}`
}

/** Calendrier du mois courant. */
export function calendarOf(activity: ActivityView | undefined, now = new Date()): StreakCalendarProps {
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const prefix = isoDay(first).slice(0, 8)
  const active = [...playedDays(activity)].filter((date) => date.startsWith(prefix)).map((date) => Number(date.slice(8)))
  const label = MONTH.format(first)
  return {
    month: label.charAt(0).toUpperCase() + label.slice(1),
    legend: active.length > 1 ? `${active.length} jours actifs` : `${active.length} jour actif`,
    offset: weekday(first),
    days,
    today: now.getDate(),
    active,
  }
}

/** Prochain palier d'assiduité (famille `ASSIDUITY`) : « Assiduité · Argent · 4 / 14 jours ». */
export function nextAssiduity(badges: BadgeCollectionView | undefined): { tier: TierCode; label: string; progress: number } | undefined {
  const family = badges?.families.find((group) => group.family === 'ASSIDUITY')
  const next = family?.badges.find((badge) => !badge.earned)
  if (!next) return undefined
  return {
    tier: next.tier,
    label: `Assiduité · ${tokens.tier[next.tier].label} · ${next.progress} / ${next.target} jours`,
    progress: Math.round((Math.min(next.progress, next.target) / Math.max(1, next.target)) * 100),
  }
}
