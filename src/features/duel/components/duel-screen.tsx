import { useMutation } from '@tanstack/react-query'
import { usePlaySession } from '@/features/play/hooks/play-session'
import { useLocalSearchParams, usePreventRemove } from 'expo-router'
import { router } from '@/shared/navigation/router'
import { useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  DuelHeader,
  ForceDark,
  haptic,
  QuestionBlock,
  ReconnectCountdown,
  RoundIntro,
  ScoreGauge,
  showDialog,
  SplashLogo,
  TimerBar,
  toCategoryCode,
  tokens,
  toast,
  useTheme,
  useToastSuppression,
  VersusIntro,
  WarningIcon,
  type AnswerCardProps,
  type RoundResult,
  useDeviceSettings,
} from '@/design-system'
import { useMe } from '@/features/me'
import { useServerClock } from '@/lib/realtime/server-clock'
import { useConnectionStore } from '@/lib/ws'
import { tierOf } from '@/shared/utils/tier'
import { sortedRounds } from '@joutio/client-domain/game'
import {
  isBonusRound,
  MAX_SCORE,
  RESULT_DELAY_MS,
  TRANSITION_GRACE_MS,
  ROUNDS,
  VS_DURATION_MS,
  SWOOSH_DURATION_MS,
  ROUND_INTRO_MS,
  LATE_JOIN_MS,
} from '@joutio/client-domain/game'
import type { GameState } from '@joutio/client-domain/game'
import { useDuelArena } from '../hooks/use-duel-arena'
import { useGameStream, usePrefetchQuestionImages, useServerNow } from '../hooks/use-game'
import { gameService } from '../lib/game-service'
import { DuelCancelled } from './duel-cancelled'
import { DuelResult } from './duel-result'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { usePlayerAvatar, usePlayerPremium } from '@/features/social/hooks/use-player-avatar'
import { usePlayerIdentity } from '@/features/me'

export interface DuelRouteParams {
  gameId: string
  topicName?: string
  category?: string
  topicId?: string
  [key: string]: string | undefined
}

/** Pastilles des manches, d'après les réponses du joueur. */
function roundResults(game: GameState, userId: string, current: number): RoundResult[] {
  const rounds = sortedRounds(game)
  return Array.from({ length: ROUNDS }, (_, index) => {
    const bonus = isBonusRound(index)
    const round = rounds[index]
    if (round?.phase === 'CLOSED') {
      const correct = round.playerAnswers[userId]?.correct === true
      return bonus ? (correct ? 'bonusCorrect' : 'bonusWrong') : correct ? 'correct' : 'wrong'
    }
    if (index === current) return bonus ? 'bonus' : 'current'
    return bonus ? 'bonus' : 'upcoming'
  })
}

/**
 * Duel (`duel.md`) : toujours sombre, sans onglets ni toasts. Le fil est piloté par les seuls instants serveur
 * (`sceneAt`) : face-à-face → manche → question → révélation → … → résultat. Le retour système ouvre l'abandon.
 * Le contenu est sous `ForceDark` pour que ses couleurs soient calculées en sombre, même si le système est clair.
 */
export function DuelScreen() {
  return (
    <ForceDark>
      <DuelScreenContent />
    </ForceDark>
  )
}

function DuelScreenContent() {
  const params = useLocalSearchParams<DuelRouteParams>()
  const gameId = params.gameId
  useToastSuppression()
  useServerClock()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const stream = useGameStream(gameId)
  const connection = useConnectionStore((state) => state.status)
  const now = useServerNow()
  const game = stream.state
  // Lu ici, avec les autres hooks : jamais après les retours anticipés (chargement, résultat) ci-dessous.
  const answerDetails = useDeviceSettings((state) => state.answerDetails)
  // Avatars : le mien, et celui de l'adversaire lu sur son profil (le flux de la partie ne porte pas ses options).
  const myAvatar = useMyAvatar()
  const opponentId = game ? (game.player1Id === userId ? game.player2Id : game.player1Id) : null
  const opponentAvatar = usePlayerAvatar(opponentId, game?.player2Type !== 'BOT')
  const opponentPremium = usePlayerPremium(opponentId, game?.player2Type !== 'BOT')
  const { myPremium } = usePlayerIdentity()
  usePrefetchQuestionImages(game?.questionImageUrls ?? [])
  const arena = useDuelArena({
    gameId,
    game: game ?? ({ gameId, rounds: {} } as GameState),
    now,
    serverNow: () => now,
    userId,
    language: me.data?.language ?? 'fr',
    refresh: () => stream.refresh(),
  })
  const scene = arena.scene
  // Fin de partie : la scène décide (`sceneAt`). `GAME_ENDED` arrive avec la clôture de la dernière manche, dont la
  // révélation reste affichée `RESULT_DELAY_MS` pour que le joueur voie son verdict ; abandon ou annulation : tout de suite.
  const finished = scene.kind === 'result'

  // Rattrapage : une transition serveur attendue tarde, ou l'écho de ma réponse : on rejoue l'historique.
  const overdue = 'overdue' in scene && scene.overdue
  useEffect(() => {
    if (overdue || arena.pendingEchoOverdue) stream.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overdue, arena.pendingEchoOverdue])

  // Haptiques de la séquence (`specs/components/duel.md`).
  const lastScene = useRef<string>('')
  useEffect(() => {
    const id = `${scene.kind}-${'round' in scene ? scene.round : ''}`
    if (id === lastScene.current) return
    lastScene.current = id
    if (scene.kind === 'vs') haptic('medium')
    if (scene.kind === 'swoosh') haptic('light')
    if (scene.kind === 'roundIntro' && scene.bonus) haptic('heavy')
    if (scene.kind === 'reveal') haptic(arena.yourPick && arena.yourPick === arena.correctAnswer ? 'success' : 'error')
  }, [scene, arena.yourPick, arena.correctAnswer])

  // Abandon : le retour système (et toute navigation arrière) ouvre la confirmation tant que la partie dure.
  const [abandoned, setAbandoned] = useState(false)
  const { hideGame } = usePlaySession()
  const abandon = useMutation({
    mutationFn: () => gameService.abandon(gameId),
    onMutate: () => hideGame(gameId, true),
    onSuccess: () => setAbandoned(true),
    onError: () => {
      hideGame(gameId, false)
      toast.error("Le duel n'a pas pu être abandonné")
    },
  })
  const [introDone, setIntroDone] = useState<number | null>(null)
  const askAbandon = () =>
    showDialog({
      title: 'Abandonner le duel ?',
      message: 'La partie compte comme perdue et ton adversaire gagne.',
      icon: WarningIcon,
      tone: 'danger',
      sheet: true,
      forceDark: true,
      actions: [
        {
          label: 'Abandonner',
          tone: 'destructive',
          onPress: () => abandon.mutateAsync(),
        },
        { label: 'Continuer', variant: 'plain' },
      ],
    })
  usePreventRemove(!finished && !abandoned, askAbandon)
  useEffect(() => {
    if (abandoned) router.back()
  }, [abandoned])

  const topic = params.topicName ?? 'Duel'
  const category = toCategoryCode(params.category)
  const isPlayer1 = game?.player1Id === userId
  const myName = me.data?.pseudonym ?? 'Moi'
  const opponentName = (isPlayer1 ? game?.player2Name : game?.player1Name) ?? (game?.player2Type === 'BOT' ? 'Robot' : 'Adversaire')
  const myTier = me.data?.progression && !me.data.progression.provisional ? tierOf(me.data.progression.rating) : undefined

  if (!game || !stream.status?.loaded) {
    return (
      <ForceDark>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
          <SplashLogo variant="loading" />
        </View>
      </ForceDark>
    )
  }

  // Partie expirée côté serveur (`GAME_EXPIRED`) : écran dédié, Elo inchangé (`etats-systeme.md`).
  if (game.status === 'CANCELED' && game.canceledReason === 'GAME_EXPIRED')
    return <DuelCancelled started={game.firstRoundAt !== null} topicId={params.topicId} topicName={topic} category={params.category} />

  if (finished) return <DuelResult gameId={gameId} game={game} topic={topic} topicId={params.topicId} category={params.category} />

  const reconnecting = connection === 'reconnecting'
  const roundNumber = arena.roundIndex + 1
  const results = roundResults(game, userId, arena.roundIndex)

  const versus = scene.kind === 'vs' || scene.kind === 'swoosh'
  const versusElapsed = scene.kind === 'vs' ? scene.elapsedMs : scene.kind === 'swoosh' ? VS_DURATION_MS + scene.elapsedMs : 0

  // L'arène reste montée pendant les intros de manche : l'intro la recouvre puis se retire, sans écran vide si la
  // manche suivante (`ROUND_STARTED`) arrive un peu après la fin de l'intro.
  const playing = scene.kind === 'question' || scene.kind === 'reveal' || scene.kind === 'roundIntro'
  const revealed = scene.kind === 'reveal'
  // L'arène reste montée sous l'intro de manche ; l'apparition de l'énoncé et le dépliage des réponses attendent
  // sa fin, sinon l'animation se joue derrière l'overlay et le joueur ne voit jamais le piano.
  const introOpen = scene.kind === 'roundIntro' && introDone !== scene.round
  const questionReady = !introOpen
  // L'apparition des réponses n'est autorisée que dans la scène de question, une fois le temps de lecture écoulé
  // (ou à la révélation). Hors de la question, `answersShown` reste faux : un montage à la fin de l'intro ne doit
  // jamais figer les cartes à leur état final.
  const answersShown = questionReady && (scene.kind === 'reveal' || (scene.kind === 'question' && !scene.locked))
  // Retard figé par manche au premier regard (`useDuelArena`) : un joueur qui a vu l'intro n'est jamais « en retard »,
  // même si l'intro n'a pas signalé sa fin avant la question (horloge serveur en avance sur l'animation).
  const animateQuestion = !arena.joinedLate || introDone === arena.roundIndex
  const answers: (AnswerCardProps & { key: string })[] = arena.answers.map(({ choice, label }) => {
    const mine = arena.yourPick === choice || arena.pendingChoice === choice
    const theirs = revealed && arena.theirPick === choice
    let state: AnswerCardProps['state'] = 'rest'
    if (revealed) state = choice === arena.correctAnswer ? 'correct' : mine || theirs ? 'wrong' : 'unchosen'
    else if (mine) state = arena.yourCorrect === true ? 'correct' : arena.yourCorrect === false ? 'wrong' : 'pending'
    else if (!arena.isAnswerable) state = 'unchosen'
    const notch = mine && theirs ? 'both' : mine ? 'me' : theirs ? 'opp' : 'none'
    return { key: choice, label, state, notch, onPress: () => arena.handleAnswer(choice) }
  })

  const seconds = Math.max(0, Math.ceil(arena.timeLeftDisplay))
  // Scores et verdicts sont autoritaires dès PLAYER_ANSWERED, comme sur le web.
  // Le choix adverse et le verdict des autres cartes attendent la révélation finale.
  const timerState = revealed || (scene.kind === 'question' && scene.locked) ? 'frozen' : 'running'

  return (
    <ForceDark>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {playing && (
          <View style={{ flex: 1, paddingTop: insets.top }}>
            <TimerBar
              seconds={arena.timeLeftDisplay}
              state={timerState}
              first={arena.firstAnswerPctValue === null ? undefined : (arena.firstAnswerPctValue / 100) * 10}
              deadline={timerState === 'running' && arena.answerDeadlineAt ? { at: arena.answerDeadlineAt, now: () => now } : undefined}
            />
            <DuelHeader
              me={{
                name: myName,
                src: myAvatar,
                premium: myPremium,
                score: arena.myScore,
                tier: myTier,
                scoreState: arena.gauge.you === 'idle' ? 'rest' : arena.gauge.you,
              }}
              opponent={{
                name: opponentName,
                src: opponentAvatar,
                premium: opponentPremium,
                score: arena.theirScore,
                scoreState: arena.gauge.them === 'idle' ? 'rest' : arena.gauge.them,
              }}
              seconds={seconds}
              timerState={timerState}
            />
            {/* Comme le lab : jauges posées sur les bords, bloc avec ses marges (16 côtés, 8 haut, zone sûre + 16 bas). */}
            <View style={{ flex: 1, minHeight: 0 }}>
              <ScoreGauge
                style={{ position: 'absolute', top: 0, bottom: 0, left: 0 }}
                value={arena.myScore}
                max={MAX_SCORE}
                label={`Score de ${myName}`}
                state={arena.gauge.you !== 'idle' ? arena.gauge.you : 'rest'}
              />
              <ScoreGauge
                style={{ position: 'absolute', top: 0, bottom: 0, right: 0 }}
                value={arena.theirScore}
                max={MAX_SCORE}
                label={`Score de ${opponentName}`}
                state={arena.gauge.them !== 'idle' ? arena.gauge.them : 'rest'}
              />
              <View style={{ flex: 1, paddingHorizontal: tokens.space[5], paddingTop: tokens.space[3], paddingBottom: insets.bottom + tokens.space[5] }}>
                <QuestionBlock
                  // Remonté à la fin de l'intro pour rejouer l'énoncé et les réponses à la première frame visible.
                  key={`question-${arena.roundIndex}-${questionReady ? 'ready' : 'intro'}`}
                  text={arena.questionText}
                  meta={`${topic} · question ${roundNumber} sur ${ROUNDS}`}
                  image={arena.imageUrl ?? undefined}
                  answers={answers}
                  answersShown={answersShown}
                  animated={animateQuestion}
                  details={answerDetails}
                />
              </View>
            </View>
          </View>
        )}
        {scene.kind === 'roundIntro' && introDone !== scene.round && (
          <RoundIntro
            key={`intro-${scene.round}`}
            round={scene.round + 1}
            total={ROUNDS}
            topic={topic}
            category={category}
            results={results}
            bonus={scene.bonus}
            animated
            duration={ROUND_INTRO_MS}
            elapsedMs={scene.elapsedMs > LATE_JOIN_MS ? scene.elapsedMs : 0}
            onComplete={() => setIntroDone(scene.round)}
          />
        )}
        {versus && (
          <VersusIntro
            key="versus"
            me={{
              name: myName,
              src: myAvatar,
              premium: myPremium,
              tier: myTier,
              detail: myTier ? `${tokens.tier[myTier].label} · ${me.data?.progression?.rating ?? ''}` : undefined,
            }}
            opponent={{ name: opponentName, src: opponentAvatar, premium: opponentPremium, detail: game.player2Type === 'BOT' ? 'Entraînement' : undefined }}
            topic={topic}
            category={category}
            rounds={ROUNDS}
            animated
            duration={VS_DURATION_MS + SWOOSH_DURATION_MS}
            elapsedMs={versusElapsed}
          />
        )}
        {scene.kind === 'waiting' && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <SplashLogo variant="loading" />
          </View>
        )}
        {reconnecting && (
          <ReconnectCountdown
            seconds={playing && !revealed ? seconds : undefined}
            waiting={{ title: `${opponentName} t'attend`, message: `Manche ${roundNumber} sur ${ROUNDS}` }}
            onLeave={askAbandon}
          />
        )}
      </View>
    </ForceDark>
  )
}
