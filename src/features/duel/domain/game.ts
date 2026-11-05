import type { RoundQuestionTranslation } from './game-notification'
import { ROUND_SECONDS } from './game-constants'

/** Convertit un instant ISO (renvoyé par l'API) en ms epoch (`null` si absent/invalide). */
export function instantToMillis(value?: string | null): number | null {
  if (!value) return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** Issue sportive d'une partie terminée vue par un joueur (`draw` sans vainqueur autoritaire). */
export function resultOutcome(winnerId: string | null, userId: string): 'win' | 'loss' | 'draw' {
  if (winnerId == null) return 'draw'
  return winnerId === userId ? 'win' : 'loss'
}

/** Résultat privé : le BFF refuse un non-participant avec un `403` (`ApiError.statusCode`). */
export function isGameAccessDenied(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  return (error as { statusCode?: unknown }).statusCode === 403
}

export type GameStatus = 'IN_PROGRESS' | 'FINISHED' | 'CANCELED'

export type GameRoundPhase = 'QUESTION_SHOWN' | 'ANSWERABLE' | 'CLOSED'

export interface PlayerAnswer {
  choice: string
  correct: boolean
  points: number
  timeMs: number
}

export interface GameRoundState {
  round: string
  questionId: string | null
  questionText: string
  imageUrl: string | null
  difficulty: string | null
  answers: Record<string, string>
  translations: Record<string, RoundQuestionTranslation>
  bonus: boolean
  phase: GameRoundPhase
  shownAt: string | null
  revealAt: string | null
  revealedAt: string | null
  answerDeadlineAt: string | null
  closedAt: string | null
  nextRoundAt: string | null
  correctAnswer: string | null
  playerAnswers: Record<string, PlayerAnswer>
}

/**
 * Résout le texte et les réponses dans la langue du joueur, avec repli sur la langue source
 * (langue absente du snapshot ou ancienne partie sans traductions).
 */
export function localizedQuestion(round: GameRoundState | null | undefined, language: string): { questionText: string; answers: Record<string, string> } {
  if (!round) {
    return { questionText: '', answers: {} }
  }
  const translation = round.translations[language]
  return {
    questionText: translation?.text ?? round.questionText,
    answers: translation?.answers ?? round.answers,
  }
}

/**
 * Read model client d'une partie — reconstruit exclusivement par fold des notifications
 * (historique REST + push WebSocket). Les scores sont recalculés depuis les réponses
 * (chaque notification n'est appliquée qu'une fois, grâce à `sequenceNumber`).
 */
export interface GameState {
  gameId: string
  topicId: string | null
  player1Id: string | null
  player1Name: string | null
  player2Id: string | null
  player2Name: string | null
  player2Type: string | null
  botDifficulty: string | null
  /** Images des questions (ordre des rounds), préchargées dès la création de la partie. */
  questionImageUrls: string[]
  /** Instant serveur du premier round (intro VS/swoosh recalée dessus). */
  firstRoundAt: string | null
  status: GameStatus
  rounds: Record<string, GameRoundState>
  player1Score: number
  player2Score: number
  winnerId: string | null
  forfeiterId: string | null
  canceledReason: string | null
}

/**
 * Chrono gelé d'un round clos : temps restant réel au moment de la clôture (0 si expiré).
 * Dérivé du serveur (`answerDeadlineAt` − `closedAt`) — pas du dernier tick client.
 */
export function frozenTimeLeft(round: GameRoundState | null): number {
  if (!round?.answerDeadlineAt || !round?.closedAt) return 0
  const deadline = Date.parse(round.answerDeadlineAt)
  const closed = Date.parse(round.closedAt)
  if (!Number.isFinite(deadline) || !Number.isFinite(closed)) return 0
  return Math.min(ROUND_SECONDS, Math.max(0, (deadline - closed) / 1000))
}

/**
 * Position (0–100) sur la timeline du chrono où le premier joueur a répondu (le plus rapide de
 * la manche) — repère « premier à répondre » de la barre du timer. `null` si personne n'a répondu.
 */
export function firstAnswerPct(round: GameRoundState | null): number | null {
  if (!round) return null
  const times = Object.values(round.playerAnswers).map((answer) => answer.timeMs)
  if (times.length === 0) return null
  const fastest = Math.min(...times)
  const pct = (1 - fastest / (ROUND_SECONDS * 1000)) * 100
  return Math.min(100, Math.max(0, pct))
}

/** Joueur le plus rapide à avoir répondu à une manche. */
export interface FirstResponder {
  playerId: string
  timeMs: number
}

/**
 * Premier à répondre d'une manche (temps de réponse le plus court parmi les joueurs connus) :
 * `null` si aucun des deux n'a répondu. Alimente l'info « premier à répondre » de la revue.
 */
export function firstResponder(round: GameRoundState | null, userId: string, opponentId: string | null): FirstResponder | null {
  if (!round) return null
  const candidates: FirstResponder[] = []
  const you = round.playerAnswers[userId]
  if (you) candidates.push({ playerId: userId, timeMs: you.timeMs })
  const them = opponentId ? round.playerAnswers[opponentId] : undefined
  if (them && opponentId) {
    candidates.push({ playerId: opponentId, timeMs: them.timeMs })
  }
  return candidates.reduce<FirstResponder | null>((fastest, current) => (fastest == null || current.timeMs < fastest.timeMs ? current : fastest), null)
}

/**
 * Deadline de réponse d'un round (ms epoch) : l'échéance autoritaire `answerDeadlineAt` si le
 * serveur l'a poussée, sinon une projection `revealAt + ROUND_SECONDS` — le serveur arme le
 * chrono à `revealAt` (`GameAggregate`). Permet au décompte de démarrer à l'heure même quand la
 * trame `QUESTION_REVEALED` est en retard sur une connexion faible.
 */
export function answerDeadlineMs(round: GameRoundState | null | undefined): number | null {
  if (!round) return null
  if (round.answerDeadlineAt) {
    const parsed = Date.parse(round.answerDeadlineAt)
    if (Number.isFinite(parsed)) return parsed
  }
  if (round.revealAt) {
    const revealAt = Date.parse(round.revealAt)
    if (Number.isFinite(revealAt)) return revealAt + ROUND_SECONDS * 1000
  }
  return null
}

/**
 * Une transition attendue par l'horloge serveur n'est pas arrivée (trame STOMP perdue ou
 * retardée) : le client doit rejouer l'historique REST au lieu d'attendre le reconnect.
 */
export function roundTransitionOverdue(round: GameRoundState | null | undefined, now: number, graceMs: number): boolean {
  if (!round) return false
  if (round.phase === 'QUESTION_SHOWN') {
    const revealAt = round.revealAt ? Date.parse(round.revealAt) : NaN
    return Number.isFinite(revealAt) && now > revealAt + graceMs
  }
  if (round.phase === 'ANSWERABLE') {
    const deadline = answerDeadlineMs(round)
    return deadline != null && now > deadline + graceMs
  }
  if (round.phase === 'CLOSED') {
    const nextRoundAt = round.nextRoundAt ? Date.parse(round.nextRoundAt) : NaN
    return Number.isFinite(nextRoundAt) && now > nextRoundAt + graceMs
  }
  return false
}

export type ArenaTimePhase = 'intro' | 'question' | 'reveal'

/**
 * Valeur affichée par le chrono (barre + numéro partagent la même source) :
 * - `reveal` : **gelée** au temps de clôture du round (plus de saut à 0) ;
 * - `intro` (initiale ou par round) : pleine (`ROUND_SECONDS`), reset simultané ;
 * - `question` : `timeLeft` (plein tant que la saisie n'est pas ouverte, puis décompte).
 */
export function displayTimeLeft(phase: ArenaTimePhase, timeLeft: number, round: GameRoundState | null): number {
  if (phase === 'reveal') return frozenTimeLeft(round)
  if (phase === 'intro') return ROUND_SECONDS
  return timeLeft
}
