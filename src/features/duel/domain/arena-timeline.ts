import {
  MATCH_INTRO_MS,
  RESULT_DELAY_MS,
  ROUND_INTRO_MS,
  ROUND_SECONDS,
  SWOOSH_DURATION_MS,
  TRANSITION_GRACE_MS,
  VS_DURATION_MS,
  isBonusRound,
} from './game-constants'
import { answerDeadlineMs, frozenTimeLeft, instantToMillis, type GameRoundState, type GameState } from './game'

/**
 * Scène courante de l'arène, dérivée **exclusivement** des instants serveur portés par le fold
 * (`firstRoundAt`, `shownAt`/`revealAt`, `revealedAt`/`answerDeadlineAt`,
 * `closedAt`/`nextRoundAt`).
 *
 * <p>Principe : une animation n'est jouée que si sa fenêtre serveur est encore active, et elle
 * démarre à l'endroit exact de cette fenêtre (`elapsedMs`) — jamais de rejeu d'une fenêtre
 * écoulée, jamais d'écran figé : si l'événement attendu n'arrive pas, `overdue` passe à `true`
 * et l'écran rejoue l'historique REST.</p>
 *
 * <p>Le serveur reste seul maître du temps : ce module n'est qu'une projection déterministe et
 * testable de ses instants.</p>
 */
export type ArenaScene =
  | { kind: 'waiting'; overdue: boolean }
  | { kind: 'vs'; elapsedMs: number; remainingMs: number; overdue: boolean }
  | { kind: 'swoosh'; elapsedMs: number; remainingMs: number; overdue: boolean }
  | {
      kind: 'roundIntro'
      round: number
      bonus: boolean
      elapsedMs: number
      remainingMs: number
      overdue: boolean
    }
  | {
      kind: 'question'
      round: number
      roundState: GameRoundState
      locked: boolean
      timeLeft: number
      elapsedMs: number
      overdue: boolean
    }
  | {
      kind: 'reveal'
      round: number
      roundState: GameRoundState
      timeLeft: number
      elapsedMs: number
      overdue: boolean
    }
  | { kind: 'result'; overdue: boolean }

interface PhaseWindow {
  kind: 'vs' | 'swoosh' | 'roundIntro' | 'question' | 'reveal'
  startAt: number
  endAt: number | null
  round: number
  locked: boolean
  deadlineAt: number | null
}

function roundNumberOf(round: string): number {
  const parsed = Number(round.replace('ROUND_', ''))
  return Number.isFinite(parsed) ? parsed : 0
}

/** Rounds triés par numéro (l'ordre d'insertion du fold n'est pas garanti). */
export function sortedRounds(game: GameState): GameRoundState[] {
  return Object.values(game.rounds).sort((a, b) => roundNumberOf(a.round) - roundNumberOf(b.round))
}

/**
 * Construit la liste ordonnée des fenêtres de phase. Chaque fenêtre s'appuie sur des instants
 * absolus : aucune durée locale n'est utilisée pour décider d'une transition.
 */
function buildWindows(game: GameState): PhaseWindow[] {
  const windows: PhaseWindow[] = []
  const rounds = sortedRounds(game)
  const firstRoundAt = instantToMillis(game.firstRoundAt)

  if (firstRoundAt != null) {
    const introStart = firstRoundAt - MATCH_INTRO_MS
    windows.push(
      {
        kind: 'vs',
        startAt: introStart,
        endAt: introStart + VS_DURATION_MS,
        round: 0,
        locked: false,
        deadlineAt: null,
      },
      {
        kind: 'swoosh',
        startAt: introStart + VS_DURATION_MS,
        endAt: introStart + VS_DURATION_MS + SWOOSH_DURATION_MS,
        round: 0,
        locked: false,
        deadlineAt: null,
      },
      {
        kind: 'roundIntro',
        startAt: firstRoundAt - ROUND_INTRO_MS,
        endAt: firstRoundAt,
        round: 0,
        locked: false,
        deadlineAt: null,
      },
    )
  }

  rounds.forEach((round, index) => {
    const shownAt = instantToMillis(round.shownAt)
    const revealAt = instantToMillis(round.revealAt)
    const revealedAt = instantToMillis(round.revealedAt)
    const deadlineAt = answerDeadlineMs(round)
    const closedAt = instantToMillis(round.closedAt)
    const nextRoundAt = instantToMillis(round.nextRoundAt)

    if (shownAt != null && revealAt != null) {
      windows.push({
        kind: 'question',
        startAt: shownAt,
        endAt: revealAt,
        round: index,
        locked: true,
        deadlineAt,
      })
    }
    const openStart = revealedAt ?? revealAt
    if (openStart != null) {
      windows.push({
        kind: 'question',
        startAt: openStart,
        endAt: deadlineAt,
        round: index,
        locked: false,
        deadlineAt,
      })
    }
    if (closedAt != null) {
      if (nextRoundAt != null) {
        const nextIntroAt = nextRoundAt - ROUND_INTRO_MS
        windows.push(
          {
            kind: 'reveal',
            startAt: closedAt,
            endAt: nextIntroAt,
            round: index,
            locked: false,
            deadlineAt: null,
          },
          {
            kind: 'roundIntro',
            startAt: nextIntroAt,
            endAt: nextRoundAt,
            round: index + 1,
            locked: false,
            deadlineAt: null,
          },
        )
      } else {
        windows.push({
          kind: 'reveal',
          startAt: closedAt,
          endAt: closedAt + RESULT_DELAY_MS,
          round: index,
          locked: false,
          deadlineAt: null,
        })
      }
    }
  })

  return windows.sort((a, b) => a.startAt - b.startAt)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Scène à afficher pour `now` (ms epoch, horloge serveur corrigée).
 *
 * @param graceMs tolérance avant de signaler `overdue` (transition serveur manquée).
 */
export function sceneAt(game: GameState, now: number, graceMs: number = TRANSITION_GRACE_MS): ArenaScene {
  const rounds = sortedRounds(game)
  const last = rounds[rounds.length - 1] ?? null
  const lastClosedAt = instantToMillis(last?.closedAt)

  if (game.status === 'CANCELED') {
    return { kind: 'result', overdue: false }
  }
  if (game.status === 'FINISHED') {
    // On laisse la révélation du dernier round s'achever avant l'écran de résultat, même si
    // `GAME_ENDED` est déjà arrivé (le serveur clôt immédiatement après `ROUND_CLOSED`).
    if (last != null && lastClosedAt != null && last.nextRoundAt == null && now < lastClosedAt + RESULT_DELAY_MS) {
      return revealScene(last, rounds.length - 1, now)
    }
    return { kind: 'result', overdue: false }
  }

  const windows = buildWindows(game)
  if (windows.length === 0) {
    // Transitoire : la partie existe (démarrée immédiatement) mais la trame `GAME_STARTED`
    // n'est pas encore arrivée — l'intro se cale dès que `firstRoundAt` est connu.
    return { kind: 'waiting', overdue: false }
  }

  // Dernière fenêtre commencée : les chevauchements éventuels sont résolus par l'ordre de
  // déclaration (une question ouverte prime sur la question verrouillée, etc.).
  let chosen: PhaseWindow | null = null
  for (const window of windows) {
    if (window.startAt <= now) {
      chosen = window
      continue
    }
    break
  }
  // Client en avance sur la première fenêtre (événement reçu tôt / horloge en retard) : on
  // démarre l'intro à son début plutôt que d'afficher un état incohérent.
  const ahead = chosen == null
  const active = chosen ?? windows[0]
  // `noUncheckedIndexedAccess` : la liste n'est jamais vide ici (garde ci-dessus).
  if (!active) return { kind: 'waiting', overdue: false }
  const overdue = active.endAt != null && now > active.endAt + graceMs

  if (active.kind === 'vs') {
    const elapsed = ahead ? 0 : clamp(now - active.startAt, 0, VS_DURATION_MS)
    return {
      kind: 'vs',
      elapsedMs: elapsed,
      remainingMs: Math.max(0, (active.endAt ?? now) - Math.max(now, active.startAt)),
      overdue,
    }
  }
  if (active.kind === 'swoosh') {
    const elapsed = ahead ? 0 : clamp(now - active.startAt, 0, SWOOSH_DURATION_MS)
    return {
      kind: 'swoosh',
      elapsedMs: elapsed,
      remainingMs: Math.max(0, (active.endAt ?? now) - Math.max(now, active.startAt)),
      overdue,
    }
  }
  if (active.kind === 'roundIntro') {
    const elapsed = ahead ? 0 : Math.max(0, now - active.startAt)
    const remaining = Math.max(0, (active.endAt ?? now) - Math.max(now, active.startAt))
    return {
      kind: 'roundIntro',
      round: active.round,
      bonus: isBonusRound(active.round),
      elapsedMs: elapsed,
      remainingMs: remaining,
      overdue,
    }
  }
  if (active.kind === 'reveal') {
    const round = rounds[active.round]
    if (round != null) {
      return revealScene(round, active.round, now, overdue)
    }
  }
  if (active.kind === 'question') {
    const round = rounds[active.round]
    if (round != null) {
      // Écoulement depuis l'apparition de la question (pas depuis la sous-fenêtre) : c'est la
      // référence des animations d'entrée et du délai de lecture.
      const questionStart = instantToMillis(round.shownAt) ?? active.startAt
      const elapsed = ahead ? 0 : Math.max(0, now - questionStart)
      const timeLeft = active.locked || active.deadlineAt == null ? ROUND_SECONDS : clamp((active.deadlineAt - now) / 1000, 0, ROUND_SECONDS)
      return {
        kind: 'question',
        round: active.round,
        roundState: round,
        locked: active.locked,
        timeLeft,
        elapsedMs: elapsed,
        overdue,
      }
    }
  }
  return { kind: 'waiting', overdue: true }
}

function revealScene(round: GameRoundState, index: number, now: number, overdue = false): ArenaScene {
  const closedAt = instantToMillis(round.closedAt) ?? now
  return {
    kind: 'reveal',
    round: index,
    roundState: round,
    timeLeft: frozenTimeLeft(round),
    elapsedMs: Math.max(0, now - closedAt),
    overdue,
  }
}
