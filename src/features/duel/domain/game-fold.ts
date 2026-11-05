import { type GameRoundState, type GameState } from './game'
import type { GameNotification } from './game-notification'

/**
 * Fold du read model `GameState` : état initial et application idempotente des notifications
 * (REST d'historique + push WebSocket, dédupliquées en amont par `sequenceNumber`).
 */

export function emptyGame(gameId: string): GameState {
  return {
    gameId,
    topicId: null,
    player1Id: null,
    player1Name: null,
    player2Id: null,
    player2Name: null,
    player2Type: null,
    botDifficulty: null,
    questionImageUrls: [],
    firstRoundAt: null,
    status: 'IN_PROGRESS',
    rounds: {},
    player1Score: 0,
    player2Score: 0,
    winnerId: null,
    forfeiterId: null,
    canceledReason: null,
  }
}

function emptyRound(round: string): GameRoundState {
  return {
    round,
    questionId: null,
    questionText: '',
    imageUrl: null,
    difficulty: null,
    answers: {},
    translations: {},
    bonus: false,
    phase: 'QUESTION_SHOWN',
    shownAt: null,
    revealAt: null,
    revealedAt: null,
    answerDeadlineAt: null,
    closedAt: null,
    nextRoundAt: null,
    correctAnswer: null,
    playerAnswers: {},
  }
}

function withRound(state: GameState, round: string, update: (current: GameRoundState) => GameRoundState): GameState {
  const current = state.rounds[round] ?? emptyRound(round)
  return {
    ...state,
    rounds: { ...state.rounds, [round]: update(current) },
  }
}

/** Fold idempotent : la déduplication par séquence est assurée en amont par le stream. */
export function applyGameNotification(state: GameState, notification: GameNotification): GameState {
  switch (notification.type) {
    case 'GAME_CREATED':
      return {
        ...state,
        topicId: notification.topicId,
        player1Id: notification.player1Id,
        player1Name: notification.player1Name,
        player2Id: notification.player2Id,
        player2Name: notification.player2Name,
        player2Type: notification.player2Type,
        botDifficulty: notification.botDifficulty,
        questionImageUrls: notification.questionImageUrls ?? [],
        status: 'IN_PROGRESS',
      }

    case 'GAME_STARTED':
      return {
        ...state,
        status: 'IN_PROGRESS',
        firstRoundAt: notification.firstRoundAt,
      }

    case 'ROUND_STARTED':
      return withRound(state, notification.round, (round) => ({
        ...round,
        questionId: notification.questionId,
        questionText: notification.questionText,
        imageUrl: notification.imageUrl ?? null,
        difficulty: notification.difficulty ?? null,
        answers: notification.answers,
        translations: notification.translations ?? {},
        bonus: notification.bonus,
        phase: 'QUESTION_SHOWN',
        shownAt: notification.shownAt,
        revealAt: notification.revealAt,
      }))

    case 'QUESTION_REVEALED':
      return withRound(state, notification.round, (round) => ({
        ...round,
        phase: 'ANSWERABLE',
        revealedAt: notification.revealedAt,
        answerDeadlineAt: notification.answerDeadlineAt,
      }))

    case 'PLAYER_ANSWERED': {
      const isPlayer1 = notification.playerId === state.player1Id
      return {
        ...withRound(state, notification.round, (round) => ({
          ...round,
          playerAnswers: {
            ...round.playerAnswers,
            [notification.playerId]: {
              choice: notification.choice,
              correct: notification.correct,
              points: notification.pointsEarned,
              timeMs: notification.timeMs,
            },
          },
        })),
        player1Score: isPlayer1 ? state.player1Score + notification.pointsEarned : state.player1Score,
        player2Score: isPlayer1 ? state.player2Score : state.player2Score + notification.pointsEarned,
      }
    }

    case 'ROUND_CLOSED':
      return withRound(state, notification.closedRound, (round) => ({
        ...round,
        phase: 'CLOSED',
        correctAnswer: notification.correctAnswer,
        closedAt: notification.closedAt,
        nextRoundAt: notification.nextRoundAt,
      }))

    case 'GAME_FORFEITED':
      return { ...state, forfeiterId: notification.forfeiterId }

    case 'GAME_ENDED':
      return {
        ...state,
        status: 'FINISHED',
        winnerId: notification.winnerId,
        player1Score: notification.player1FinalScore,
        player2Score: notification.player2FinalScore,
      }

    case 'GAME_CANCELLED':
      return {
        ...state,
        status: 'CANCELED',
        canceledReason: notification.reason,
      }

    default: {
      // Exhaustivité : ajouter un type non géré casse la compilation.
      const unreachable: never = notification
      void unreachable
      return state
    }
  }
}
