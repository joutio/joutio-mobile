import { t } from '@/lib/i18n'

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Délai lisible : « 23 h », « 45 min », « 3 j ». */
export function duration(ms: number) {
  const value = Math.max(0, ms)
  if (value >= 2 * DAY) return t('mobile.time.days', { n: Math.floor(value / DAY) })
  if (value >= HOUR) return t('mobile.time.hours', { n: Math.floor(value / HOUR) })
  return t('mobile.time.minutes', { n: Math.max(1, Math.floor(value / 60_000)) })
}
