import { tokens, type TierCode } from '@/design-system'
import { formatNumber, MASTERY_TIERS, MASTERY_XP, tierLabel } from '@/features/topic/lib/format'
import type { MasteryTier, TitleView } from '@joutio/client/profile'
import { topicName } from '@/shared/utils/topic-name'
import { titleLabel as sharedTitleLabel } from '@joutio/client/authoring'
import { t } from '@/lib/i18n'

export const RANKS = Object.keys(tokens.tier) as TierCode[]

/** Palier de maîtrise atteint avec `xp`. */
export const masteryOf = (xp: number): MasteryTier => MASTERY_TIERS.reduce<MasteryTier>((best, tier) => (xp >= MASTERY_XP[tier] ? tier : best), 'FER')

/** Libellé d'un titre : nom thématique du sujet s'il existe, sinon « palier · sujet » (composé côté client). */
export const titleLabel = (title: TitleView) => sharedTitleLabel(title.topic.titles, title.tier, topicName(title.topic.names))

/** Condition d'un rang : « Moins de 400 Elo », « Dès 600 Elo ». */
export function rankRule(tier: TierCode) {
  const index = RANKS.indexOf(tier)
  const next = RANKS[index + 1]
  if (index === 0 && next) return t('ranks.below', { elo: formatNumber(tokens.tier[next].minElo) })
  return t('ranks.from', { elo: formatNumber(tokens.tier[tier].minElo) })
}

/** Avancement dans le rang courant : « Or · 856 », 28 %, « 144 Elo avant Platine ». */
export function rankProgress(tier: TierCode, rating: number) {
  const next = RANKS[RANKS.indexOf(tier) + 1]
  const label = t('common.dotPair', { a: tierLabel(tier), b: formatNumber(rating) })
  if (!next) return { label, progress: 100, next: t('ranks.top') }
  const from = tokens.tier[tier].minElo
  const to = tokens.tier[next].minElo
  return {
    label,
    progress: Math.round(((rating - from) / Math.max(1, to - from)) * 100),
    next: t('ranks.before', { elo: formatNumber(Math.max(0, to - rating)), tier: tierLabel(next) }),
  }
}
