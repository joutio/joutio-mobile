import { useMemo, useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ApiError } from '@joutio/client-domain/api-types'
import { gameService } from '../lib/game-service'

type GaugeState = 'idle' | 'correct' | 'wrong'
import { sceneAt, type ArenaScene } from '@joutio/client-domain/game'
import { answerDeadlineMs, firstAnswerPct, localizedQuestion, type GameState } from '@joutio/client-domain/game'
import { isGameChoice, type GameChoice } from '@joutio/client-domain/game'
import { LATE_JOIN_MS, PENDING_ECHO_GRACE_MS, ROUND_SECONDS } from '@joutio/client-domain/game'

/** Option de réponse affichée (`A`→`D`, libellé localisé). */
export interface AnswerOption {
  choice: string
  label: string
}

function toAnswerList(record: Record<string, string> | null | undefined): AnswerOption[] {
  if (!record) return []
  return Object.keys(record)
    .sort()
    .map((choice) => ({ choice, label: record[choice] ?? '' }))
}

export interface UseDuelArenaParams {
  gameId: string
  /** Read model de la partie (fold REST + STOMP). */
  game: GameState
  /** Horloge serveur corrigée (ms epoch), rafraîchie par le tick de l'arène. */
  now: number
  serverNow: () => number
  userId: string
  language: string
  /** Rejoue l'historique REST (rattrapage / réconciliation d'une réponse optimiste). */
  refresh: () => void
}

/**
 * View model de l'arène : dérive du fold + de la scène serveur tout ce que l'écran affiche
 * (round courant, réponses, jauges, saisie) et porte la **sélection optimiste** de réponse.
 *
 * <p>La saisie suit la phase serveur (`ANSWERABLE`) : l'horloge cliente n'a pas le pouvoir de
 * verrouiller le joueur.</p>
 */
export function useDuelArena({ gameId, game, now, serverNow, userId, language, refresh }: UseDuelArenaParams) {
  // Réponse : pas de retry automatique (la fenêtre est courte) ; un échec se réconcilie par l'historique.
  const answer = useMutation({ mutationFn: (choice: GameChoice) => gameService.answer(gameId, choice), retry: 1 })
  // Sélection locale optimiste : affichée dès le clic, remplacée par l'écho serveur
  // (`PLAYER_ANSWERED`). `sentAt` sert au rattrapage REST si l'écho tarde.
  const [pending, setPending] = useState<{
    round: number
    choice: GameChoice
    sentAt: number
  } | null>(null)

  const scene: ArenaScene = useMemo(() => sceneAt(game, now), [game, now])

  const roundIndex = scene.kind === 'question' || scene.kind === 'reveal' ? scene.round : scene.kind === 'roundIntro' ? scene.round : 0
  const currentRound = scene.kind === 'question' || scene.kind === 'reveal' ? scene.roundState : null

  const isPlayer1 = game.player1Id === userId
  const myScore = isPlayer1 ? game.player1Score : game.player2Score
  const theirScore = isPlayer1 ? game.player2Score : game.player1Score
  const opponentId = isPlayer1 ? game.player2Id : game.player1Id

  const localized = useMemo(() => localizedQuestion(currentRound, language), [currentRound, language])
  const answers = useMemo(() => toAnswerList(localized.answers), [localized])
  const questionText = localized.questionText
  const imageUrl = currentRound?.imageUrl ?? null
  // Client arrivé après le début de la question (reprise/rechargement) : on saute le délai de
  // lecture et les animations d'entrée pour rendre la question immédiatement. **Décidé une fois par manche, au premier
  // regard** (intro ou question) : recalculé à chaque rendu, `elapsedMs` dépassait `LATE_JOIN_MS` en pleine question
  // et coupait l'apparition des réponses (révélées à `QUESTION_READ_MS`) dès que l'intro n'avait pas signalé sa fin.
  const lateRounds = useRef(new Map<number, boolean>())
  if ((scene.kind === 'roundIntro' || scene.kind === 'question') && !lateRounds.current.has(scene.round)) {
    lateRounds.current.set(scene.round, scene.kind === 'question' && scene.elapsedMs > LATE_JOIN_MS)
  }
  const joinedLate = lateRounds.current.get(roundIndex) ?? false
  const correctAnswer = currentRound?.correctAnswer ?? null

  const yourAnswer = currentRound?.playerAnswers[userId] ?? null
  const opponentAnswer = opponentId ? (currentRound?.playerAnswers[opponentId] ?? null) : null
  const yourPick = yourAnswer?.choice ?? null
  const theirPick = opponentAnswer?.choice ?? null
  const yourCorrect = yourAnswer?.correct ?? null
  const theirCorrect = opponentAnswer?.correct ?? null
  const gain = yourAnswer || opponentAnswer ? { you: yourAnswer?.points ?? 0, them: opponentAnswer?.points ?? 0 } : null
  const firstAnswerPctValue = useMemo(() => firstAnswerPct(currentRound), [currentRound])

  // Sélection optimiste du round courant, tant que le serveur n'a rien enregistré.
  const pendingAnswer = pending && pending.round === roundIndex && scene.kind === 'question' && !yourPick ? pending : null
  const pendingChoice = pendingAnswer?.choice ?? null

  const isAnswerable = scene.kind === 'question' && !scene.locked && !scene.overdue && !yourPick && pendingAnswer == null

  // Rattrapage REST : l'écho de ma réponse tarde → l'arène rejoue l'historique au lieu
  // d'attendre le reconnect WS (jusqu'à 30 s).
  const pendingEchoOverdue = pendingAnswer != null && now - pendingAnswer.sentAt > PENDING_ECHO_GRACE_MS

  const timeLeftDisplay = scene.kind === 'question' || scene.kind === 'reveal' ? scene.timeLeft : ROUND_SECONDS

  const gauge: { you: GaugeState; them: GaugeState } = {
    you:
      scene.kind === 'reveal' && correctAnswer != null
        ? yourPick === correctAnswer
          ? 'correct'
          : 'wrong'
        : yourCorrect === true
          ? 'correct'
          : yourCorrect === false
            ? 'wrong'
            : 'idle',
    them:
      scene.kind === 'reveal' && correctAnswer != null
        ? theirPick === correctAnswer
          ? 'correct'
          : 'wrong'
        : theirCorrect === true
          ? 'correct'
          : theirCorrect === false
            ? 'wrong'
            : 'idle',
  }

  const handleAnswer = (choice: string) => {
    if (!isAnswerable || !isGameChoice(choice)) return
    setPending({ round: roundIndex, choice, sentAt: serverNow() })
    answer.mutate(choice, {
      onError: (error) => {
        // Après les retries automatiques : réseau/timeout, 5xx ou 409 (réponse peut-être
        // déjà enregistrée) → réconcilier par l'historique, sans rien afficher.
        const status = (error as ApiError | undefined)?.statusCode
        if (status === 409 || status == null || status === 408 || status >= 500) {
          refresh()
        }
      },
    })
  }

  return {
    scene,
    roundIndex,
    isPlayer1,
    myScore,
    theirScore,
    opponentId,
    answers,
    questionText,
    imageUrl,
    joinedLate,
    correctAnswer,
    yourPick,
    theirPick,
    yourCorrect,
    theirCorrect,
    /**
     * Fin du chrono de réponse du round (instant serveur, ms epoch) : le tic-tac de l'arène s'y
     * cale comme sur les countdowns (`useCountdownTicks`). `null` hors question/reveal.
     */
    answerDeadlineAt: answerDeadlineMs(currentRound),
    gain,
    firstAnswerPctValue,
    pendingChoice,
    isAnswerable,
    pendingEchoOverdue,
    timeLeftDisplay,
    gauge,
    handleAnswer,
  }
}

export type DuelArena = ReturnType<typeof useDuelArena>
