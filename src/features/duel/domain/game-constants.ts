export const ROUNDS = 7
export const ROUND_SECONDS = 10

export const NORMAL_BASE_POINTS = 10
export const NORMAL_SPEED_BONUS = 10
export const BONUS_BASE_POINTS = 20
export const BONUS_SPEED_BONUS = 20

export const NORMAL_MAX = NORMAL_BASE_POINTS + NORMAL_SPEED_BONUS
export const BONUS_MAX = BONUS_BASE_POINTS + BONUS_SPEED_BONUS

export const MAX_SCORE = (ROUNDS - 1) * NORMAL_MAX + BONUS_MAX

export const isBonusRound = (round: number): boolean => round === ROUNDS - 1

export const QUESTION_READ_MS = 1400
export const ANSWER_REVEAL_STAGGER_MS = 120

/**
 * Durées purement présentationnelles (le serveur reste source de vérité du chrono) :
 * l'écran VS et la transition avant le premier round.
 */
export const VS_DURATION_MS = 2700
export const SWOOSH_DURATION_MS = 1450

/**
 * Durée de l'intro de tour (RoundIntro) affichée avant chaque question. La transition
 * serveur entre deux rounds (`GameRules.ROUND_TRANSITION_MS`) est scindée en révélation
 * du round clos puis intro du round suivant.
 */
export const ROUND_INTRO_MS = 1900

/**
 * Budget serveur avant le premier round (`GameRules.MATCH_INTRO_MS`) : l'écran VS, la
 * transition puis l'annonce du tour. Le serveur ne transmet que `firstRoundAt` ; on reconstitue
 * le début de la fenêtre pour rejouer/compresser l'intro à l'endroit exact de la timeline.
 */
export const MATCH_INTRO_MS = VS_DURATION_MS + SWOOSH_DURATION_MS + ROUND_INTRO_MS

/**
 * Retard (ms) au-delà duquel le client a raté le début d'un round : entrée sans animation.
 */
export const LATE_JOIN_MS = 500

/**
 * Révélation d'un score en duel (jauges latérales **et** compteurs, solidaires) : montée posée et
 * **linéaire** (`height 0.9s linear` sur `.qu-gauge`, `index.css`) — la salve de tics
 * d'accumulation progresse au même rythme (`features/game/domain/accumulation.ts`).
 */
export const SCORE_REVEAL_MS = 900

/**
 * Reveal de la récompense sur la page résultat (remplissage de l'anneau de maîtrise **et**
 * compteur « XP gagnée », solidaires) : ample et **linéaire**, la salve d'XP progressant au même
 * rythme (`features/game/domain/accumulation.ts`).
 */
export const RING_REVEAL_MS = 1600

/** Grâce (ms) avant de considérer une transition serveur attendue comme manquée. */
export const TRANSITION_GRACE_MS = 1_500

/** Intervalle de rattrapage tant qu'une transition serveur attendue reste en retard. */
export const CATCH_UP_INTERVAL_MS = 2_500

/** Délai sans écho serveur après envoi d'une réponse → rejouer l'historique REST. */
export const PENDING_ECHO_GRACE_MS = 3_000

/**
 * Délai (ms) avant de basculer sur l'écran de résultat après la fin de la partie : on laisse
 * la révélation du dernier round durer autant qu'un round normal (`ROUND_TRANSITION_MS` −
 * `ROUND_INTRO_MS`), pour que la jauge de score, le compteur et les couleurs des cases aient
 * le temps de se terminer.
 */
export const RESULT_DELAY_MS = 2500
