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
  HandshakeIcon,
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
  MASTERY: { name: 'Maîtrise', icon: GraduationCapIcon, description: "Points d'expérience de ton meilleur sujet." },
  EXPLOIT: { name: 'Exploits', icon: SparkleIcon, description: 'Hauts faits ponctuels, chacun à son palier, dans n’importe quel ordre.' },
  SERIES: { name: 'Série', icon: FireIcon, description: 'Victoires de suite contre des joueurs.' },
  ASSIDUITY: { name: 'Assiduité', icon: CalendarCheckIcon, description: 'Jours de suite avec au moins un duel terminé.' },
  SOCIAL: { name: 'Social', icon: UsersIcon, description: 'Abonnés gagnés.' },
  CHALLENGES: { name: 'Défis', icon: MegaphoneIcon, description: 'Défis lancés à d’autres joueurs.' },
  VISION: { name: 'Vision', icon: EyeIcon, description: 'Bonnes réponses aux questions illustrées.' },
  PRECISION: { name: 'Précision', icon: TargetIcon, description: 'Duels terminés sans mauvaise réponse.' },
  SPEED: { name: 'Rapidité', icon: GaugeIcon, description: 'Bonnes réponses en moins de 3 s, cumulées sur tes duels entre joueurs.' },
  EXPLORATION: { name: 'Exploration', icon: CompassIcon, description: 'Sujets différents joués.' },
  COLLECTION: { name: 'Collection', icon: StackIcon, description: 'Badges acquis au total.' },
  RECRUITER: { name: 'Recruteur', icon: HandshakeIcon, description: 'Amis parrainés qui ont terminé leur premier duel.' },
}

/** Unité d'un compteur, au singulier puis au pluriel, en toutes lettres (« point d'expérience »). */
const UNITS: Record<string, readonly [string, string]> = {
  HUMAN_DUELS: ['duel', 'duels'],
  HUMAN_WINS: ['victoire', 'victoires'],
  WIN_STREAK: ["victoire d'affilée", "victoires d'affilée"],
  PERFECT_DUELS: ['duel parfait', 'duels parfaits'],
  FAST_ANSWERS: ['réponse rapide', 'réponses rapides'],
  DAILY_STREAK: ["jour d'affilée", "jours d'affilée"],
  FOLLOWERS_GAINED: ['abonné', 'abonnés'],
  CHALLENGES_SENT: ['défi lancé', 'défis lancés'],
  REFERRALS_QUALIFIED: ['ami parrainé', 'amis parrainés'],
  IMAGE_CORRECT: ['question illustrée', 'questions illustrées'],
  TOPIC_MASTERY: ["point d'expérience", "points d'expérience"],
  DISTINCT_TOPICS: ['sujet', 'sujets'],
  EARNED_BADGES: ['badge', 'badges'],
  ONE_SHOT: ['exploit', 'exploits'],
}

/** Valeur d'échelle (espace réduit) : « XP » pour la maîtrise. */
const LADDER_UNITS: Record<string, string> = { TOPIC_MASTERY: 'XP' }

/** Exploits : nom et critère de déblocage en toutes lettres (`BadgeRules` de `joutio-profile`). */
const FEATS: Record<string, { title: string; rule: string }> = {
  FIRST_WIN: { title: 'Première victoire', rule: 'Gagner un duel contre un joueur.' },
  LIGHTNING: { title: 'Éclair', rule: '5 bonnes réponses en moins de 3 s dans un même duel.' },
  PERFECT: { title: 'Perfectionniste', rule: 'Marquer le score maximal, 160 points, dans un duel.' },
  STREAK_MASTER: { title: 'Série de feu', rule: 'Gagner 10 duels de suite.' },
}

const unitOf = (badge: BadgeItemView, count: number) => UNITS[badge.metric]?.[count > 1 ? 1 : 0] ?? ''

export interface BadgeFamilySummary {
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

/** Une famille de la collection, mise en forme pour `BadgeFamilyRow` et `RankLadder`. */
export function summarize(family: BadgeFamily, badges: readonly BadgeItemView[]): BadgeFamilySummary {
  const info = FAMILIES[family] ?? { name: family, icon: SparkleIcon, description: '' }
  const sorted = [...badges].sort((a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier))
  const earned = sorted.filter((badge) => badge.earned).length
  const current = sorted.find((badge) => !badge.earned)
  const progress = current ? Math.round((Math.min(current.progress, current.target) / Math.max(1, current.target)) * 100) : 100
  const feat = family === 'EXPLOIT'
  const left = current ? Math.max(0, current.target - current.progress) : 0
  const remaining = current && !feat ? `Encore ${formatNumber(left)} ${unitOf(current, left)}`.trim() : undefined
  // Exploits : un haut fait nommé par ligne, avec son critère de déblocage (jamais « 1 exploit »).
  const rungs = sorted.map<LadderRung>((badge) => ({
    tier: badge.tier,
    title: feat ? (FEATS[badge.code]?.title ?? badge.label) : undefined,
    rule: feat ? (FEATS[badge.code]?.rule ?? '') : `${formatNumber(badge.target)} ${LADDER_UNITS[badge.metric] ?? unitOf(badge, badge.target)}`.trim(),
    status: badge.earned ? 'Acquis' : !feat && badge === current ? `${formatNumber(badge.progress)} / ${formatNumber(badge.target)}` : '—',
    earned: badge.earned,
  }))
  const feats = feat ? sorted.map((badge) => ({ tier: badge.tier, earned: badge.earned })) : undefined
  return { family, ...info, earned, progress, remaining, feats, rungs }
}

/** Familles à échelle (7 paliers), dans l'ordre du serveur ; les exploits ponctuels n'ont pas d'échelle. */
export function familiesOf(collection: BadgeCollectionView): BadgeFamilySummary[] {
  return collection.families.filter((group) => group.badges.length > 0).map((group) => summarize(group.family, group.badges))
}

export const badgesSummary = (collection: BadgeCollectionView) =>
  `${collection.earnedCount} acquis sur ${collection.totalCount} · ${collection.families.length} familles`
