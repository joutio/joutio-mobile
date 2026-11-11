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
import { formatNumber } from '@/features/topic/lib/format'
import type { BadgeCollectionView, BadgeFamily, BadgeItemView } from '@joutio/client-domain/api-types'

const TIERS = Object.keys(tokens.tier) as TierCode[]

/** Nom, emblème et définition de chaque famille (libellés de `joutio-web`, définitions du lab). */
export const FAMILIES: Record<BadgeFamily, { name: string; icon: Icon; description: string }> = {
  VOLUME: { name: 'Volume', icon: SwordIcon, description: 'Duels terminés contre des joueurs.' },
  VICTORY: { name: 'Victoires', icon: CrownIcon, description: 'Duels gagnés contre des joueurs.' },
  MASTERY: { name: 'Maîtrise', icon: GraduationCapIcon, description: 'XP de ton meilleur sujet.' },
  EXPLOIT: { name: 'Exploits', icon: SparkleIcon, description: 'Hauts faits rares.' },
  SERIES: { name: 'Série', icon: FireIcon, description: 'Victoires de suite contre des joueurs.' },
  ASSIDUITY: { name: 'Assiduité', icon: CalendarCheckIcon, description: 'Jours de suite avec au moins un duel terminé.' },
  SOCIAL: { name: 'Social', icon: UsersIcon, description: 'Abonnés gagnés.' },
  CHALLENGES: { name: 'Défis', icon: MegaphoneIcon, description: 'Défis lancés à d’autres joueurs.' },
  VISION: { name: 'Vision', icon: EyeIcon, description: 'Bonnes réponses aux questions illustrées.' },
  PRECISION: { name: 'Précision', icon: TargetIcon, description: 'Duels terminés sans mauvaise réponse.' },
  SPEED: { name: 'Rapidité', icon: GaugeIcon, description: 'Bonnes réponses en moins de 3 s, cumulées sur tes duels entre joueurs.' },
  EXPLORATION: { name: 'Exploration', icon: CompassIcon, description: 'Sujets différents joués.' },
  COLLECTION: { name: 'Collection', icon: StackIcon, description: 'Badges acquis au total.' },
}

/** Unité d'un compteur, au pluriel (`joutio-web`, `progression.metric`). */
const UNITS: Record<string, string> = {
  HUMAN_DUELS: 'duels',
  HUMAN_WINS: 'victoires',
  WIN_STREAK: "victoires d'affilée",
  PERFECT_DUELS: 'duels parfaits',
  FAST_ANSWERS: 'réponses rapides',
  DAILY_STREAK: "jours d'affilée",
  FOLLOWERS_GAINED: 'abonnés',
  CHALLENGES_SENT: 'défis lancés',
  IMAGE_CORRECT: 'questions illustrées',
  TOPIC_MASTERY: 'XP',
  DISTINCT_TOPICS: 'sujets',
  EARNED_BADGES: 'badges',
  ONE_SHOT: 'exploit',
}

const unitOf = (badge: BadgeItemView) => UNITS[badge.metric] ?? ''

export interface BadgeFamilySummary {
  family: BadgeFamily
  name: string
  icon: Icon
  description: string
  /** Paliers acquis, de 0 à 7. */
  earned: number
  /** Avancement vers le palier suivant, en %. */
  progress: number
  /** `Or · 30 / 100`, `4 / 5`, `Diamant · complet`. */
  meta: string
  rungs: LadderRung[]
}

/** Une famille de la collection, mise en forme pour `BadgeFamilyRow` et `RankLadder`. */
export function summarize(family: BadgeFamily, badges: readonly BadgeItemView[]): BadgeFamilySummary {
  const info = FAMILIES[family] ?? { name: family, icon: SparkleIcon, description: '' }
  const sorted = [...badges].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
  const earned = sorted.filter((badge) => badge.earned).length
  const current = sorted.find((badge) => !badge.earned)
  const lastEarned = [...sorted].reverse().find((badge) => badge.earned)
  const progress = current ? Math.round((Math.min(current.progress, current.target) / Math.max(1, current.target)) * 100) : 100
  const reached = lastEarned ? tokens.tier[lastEarned.tier].label : undefined
  const meta = current
    ? [reached, `${formatNumber(current.progress)} / ${formatNumber(current.target)}`].filter(Boolean).join(' · ')
    : `${reached ?? ''} · complet`
  const rungs = sorted.map<LadderRung>((badge) => ({
    tier: badge.tier,
    rule: `${formatNumber(badge.target)} ${unitOf(badge)}`.trim(),
    status: badge.earned ? 'Acquis' : badge === current ? `${formatNumber(badge.progress)} / ${formatNumber(badge.target)}` : '—',
    earned: badge.earned,
  }))
  return { family, ...info, earned, progress, meta, rungs }
}

/** Familles à échelle (7 paliers), dans l'ordre du serveur ; les exploits ponctuels n'ont pas d'échelle. */
export function familiesOf(collection: BadgeCollectionView): BadgeFamilySummary[] {
  return collection.families.filter((group) => group.badges.length > 0).map((group) => summarize(group.family, group.badges))
}

export const badgesSummary = (collection: BadgeCollectionView) =>
  `${collection.earnedCount} acquis sur ${collection.totalCount} · ${collection.families.length} familles`
