import type { BadgeCollectionView, BadgeFamily, BadgeItemView, BadgeView } from '@joutio/client/profile'
import {
  CalendarCheckIcon,
  CompassIcon,
  CrownIcon,
  EyeIcon,
  FireIcon,
  GaugeIcon,
  GraduationCapIcon,
  MegaphoneIcon,
  SparkleIcon,
  StackIcon,
  SwordIcon,
  TargetIcon,
  tokens,
  UsersIcon,
  type Icon,
  type LadderRung,
  type TierCode,
} from '@/design-system'
import { formatNumber, type MessageKey } from '@/lib/i18n'

/* Repris de `joutio-web` (`features/profile/lib/badges.ts`) : mêmes clés de texte (`badges.*`), mêmes règles. */
type T = (key: MessageKey, values?: Record<string, string | number>) => string

const TIERS = Object.keys(tokens.tier) as TierCode[]

/** Emblème de chaque famille ; nom et définition dans les textes (`badges.family.*`). */
const ICONS: Record<BadgeFamily, Icon> = {
  VOLUME: SwordIcon,
  VICTORY: CrownIcon,
  MASTERY: GraduationCapIcon,
  EXPLOIT: SparkleIcon,
  SERIES: FireIcon,
  ASSIDUITY: CalendarCheckIcon,
  SOCIAL: UsersIcon,
  CHALLENGES: MegaphoneIcon,
  VISION: EyeIcon,
  PRECISION: TargetIcon,
  SPEED: GaugeIcon,
  EXPLORATION: CompassIcon,
  COLLECTION: StackIcon,
}

/** Unité d'un compteur (`badges.unit.*`), par métrique du BFF. */
const UNITS = new Set([
  'HUMAN_DUELS',
  'HUMAN_WINS',
  'WIN_STREAK',
  'PERFECT_DUELS',
  'FAST_ANSWERS',
  'DAILY_STREAK',
  'FOLLOWERS_GAINED',
  'CHALLENGES_SENT',
  'IMAGE_CORRECT',
  'TOPIC_MASTERY',
  'DISTINCT_TOPICS',
  'EARNED_BADGES',
  'ONE_SHOT',
])

/** Exploits connus (`Badge` de `joutio-profile`), dont l'app a le nom et le critère traduits. */
const FEATS = new Set(['FIRST_WIN', 'LIGHTNING', 'PERFECT', 'STREAK_MASTER'])

export type BadgeFamilySummary = {
  family: BadgeFamily
  name: string
  icon: Icon
  description: string
  /** Paliers acquis, de 0 à 7. */
  earned: number
  /** Avancement vers le palier suivant, en %. */
  progress: number
  /** Ce qui reste avant le palier suivant : « Encore 70 réponses rapides » ; absent une fois les 7 acquis. */
  remaining?: string
  /** Exploits : hauts faits ponctuels, chacun à son palier, sans échelle (`BadgeFamilyRow` `feats`). */
  feats?: { tier: TierCode; earned: boolean }[]
  rungs: LadderRung[]
}

/** Une famille de la collection, mise en forme pour `BadgeFamilyRow` et `RankLadder` (comme le mobile). */
function summarize(family: BadgeFamily, badges: readonly BadgeItemView[], t: T, language: string): BadgeFamilySummary {
  const known = family in ICONS
  const sorted = [...badges].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
  const earned = sorted.filter((badge) => badge.earned).length
  const current = sorted.find((badge) => !badge.earned)
  const progress = current ? Math.round((Math.min(current.progress, current.target) / Math.max(1, current.target)) * 100) : 100
  const count = (value: number) => formatNumber(value, language)
  // Unité en toutes lettres et accordée (« Encore 1 victoire », « Encore 1 166 points d'expérience »).
  const left = current ? Math.max(0, current.target - current.progress) : 0
  const remaining = current
    ? UNITS.has(current.metric)
      ? t(left > 1 ? 'badges.remainingMany' : 'badges.remainingOne', {
          count: count(left),
          unit: t(`badges.${left > 1 ? 'unitLong' : 'unitOne'}.${current.metric}` as MessageKey),
        })
      : t('badges.remainingPlain', { count: count(left) })
    : undefined
  const unit = (badge: BadgeItemView) => (UNITS.has(badge.metric) ? t(`badges.unit.${badge.metric}` as MessageKey) : '')
  // Exploits : un haut fait nommé par ligne, avec son critère de déblocage en toutes lettres (jamais « 1 exploit »).
  const feat = family === 'EXPLOIT'
  const rungs = sorted.map<LadderRung>((badge) => ({
    tier: badge.tier,
    title: feat ? (FEATS.has(badge.code) ? t(`badges.feat.${badge.code}` as MessageKey) : badge.label) : undefined,
    rule: feat ? (FEATS.has(badge.code) ? t(`badges.featRule.${badge.code}` as MessageKey) : '') : `${count(badge.target)} ${unit(badge)}`.trim(),
    status: badge.earned ? t('badges.earned') : !feat && badge === current ? `${count(badge.progress)} / ${count(badge.target)}` : '—',
    earned: badge.earned,
  }))
  return {
    family,
    name: known ? t(`badges.family.${family}` as MessageKey) : family,
    icon: ICONS[family] ?? SparkleIcon,
    description: known ? t(`badges.family.${family}.text` as MessageKey) : '',
    earned,
    progress,
    remaining: family === 'EXPLOIT' ? undefined : remaining,
    feats: family === 'EXPLOIT' ? sorted.map((badge) => ({ tier: badge.tier, earned: badge.earned })) : undefined,
    rungs,
  }
}

/** Familles à échelle, dans l'ordre du serveur. */
/** Écran de déblocage d'un badge (`BadgeUnlock`, `resultat.md` § 3) : nom, famille, emblème et phrase de la famille. */
export function badgeUnlockOf(badge: BadgeView, t: T): { name: string; family: string; icon: Icon; text: string } {
  const known = badge.family in ICONS
  return {
    name: FEATS.has(badge.code) ? t(`badges.feat.${badge.code}` as MessageKey) : badge.label,
    family: known ? t(`badges.family.${badge.family}` as MessageKey) : badge.family,
    icon: ICONS[badge.family] ?? SparkleIcon,
    text: known ? t(`badges.family.${badge.family}.text` as MessageKey) : '',
  }
}

export function familiesOf(collection: BadgeCollectionView, t: T, language: string): BadgeFamilySummary[] {
  return collection.families.filter((group) => group.badges.length > 0).map((group) => summarize(group.family, group.badges, t, language))
}

export const badgesSummary = (collection: BadgeCollectionView, t: T) =>
  t('badges.summary', { earned: collection.earnedCount, total: collection.totalCount, families: collection.families.length })
