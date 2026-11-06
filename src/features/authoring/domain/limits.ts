/**
 * Plafonds de création (`creation.md` § 3). **Appliqués par l'app seule** : le backend ne les porte pas encore
 * (à ajouter à côté de `DuelLimitPolicy`). Celui des questions contient aussi le volume d'images stockées.
 */
export const MIN_QUESTIONS = 7
export const MAX_NAME = 40
export const MAX_QUESTION = 120
export const MAX_ANSWER = 60
/** Description d'image : courte, lue d'une traite par un lecteur d'écran. */
export const MAX_ALT = 125
export const MAX_REJECT = 280

export const CREATION_LIMITS = {
  free: { topics: 1, questions: 30 },
  premium: { topics: 10, questions: 150 },
} as const

export const limitsFor = (premium: boolean) => (premium ? CREATION_LIMITS.premium : CREATION_LIMITS.free)

/** Accroche de la feuille Premium à chaque limite gratuite. */
export const LIMIT_REASONS = {
  topics: `Tu as publié ton sujet gratuit. Premium t'en donne ${CREATION_LIMITS.premium.topics}.`,
  questions: `Tu as atteint ${CREATION_LIMITS.free.questions} questions. Premium monte la limite à ${CREATION_LIMITS.premium.questions}.`,
  team: 'Invite des rédacteurs et des administrateurs avec Premium.',
} as const

export type LimitReason = keyof typeof LIMIT_REASONS

export const questionsLabel = (count: number) => `${count} question${count > 1 ? 's' : ''}`
