import { router } from 'expo-router'
import { useState } from 'react'
import { Share, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Banner,
  Button,
  CaretUpIcon,
  ChatCircleIcon,
  EloSummary,
  FlagIcon,
  ForceDark,
  IconButton,
  LightningIcon,
  MasteryRing,
  RankPromotion,
  ResultHeader,
  TitleUnlock,
  tokens,
  UnlockSequence,
  useTheme,
  XIcon,
  type MatchOutcome,
  type RoundResult,
  type TierCode,
} from '@/design-system'
import { useMe } from '@/features/me'
import { useBotDifficulty, useStartMatchmaking, useStartTraining } from '@/features/play/hooks/use-play'
import { useSendRematch } from '@/features/play/hooks/use-rematch'
import { useMyTitles, useWearTitle } from '@/features/topic/hooks/use-topic'
import { formatNumber, MASTERY_TIERS, MASTERY_XP, tierLabel } from '@/features/topic/lib/format'
import type { MasteryTier } from '@/shared/types/bff'
import { tierOf } from '@/shared/utils/tier'
import { sortedRounds } from '../domain/arena-timeline'
import { isBonusRound, ROUNDS } from '../domain/game-constants'
import type { GameState } from '../domain/game'
import type { GameResultView } from '../domain/game-dto'
import { useGameResult } from '../hooks/use-game'
import { DuelChat } from './duel-chat'
import { DuelReview } from './duel-review'
import { ReportPlayerSheet } from './report-sheets'

const ORDER = Object.keys(tokens.tier) as TierCode[]
const masteryOf = (xp: number): MasteryTier => MASTERY_TIERS.reduce<MasteryTier>((best, tier) => (xp >= MASTERY_XP[tier] ? tier : best), 'FER')

type Unlock = { kind: 'rank'; from: TierCode; tier: TierCode } | { kind: 'title'; tier: MasteryTier }

/**
 * Déblocages de la partie, dans l'ordre de la spec (rang, puis titres) : déduits du bilan, faute d'événements
 * rattachés à la partie. Rang : palier d'Elo avant / après. Titres : chaque palier de maîtrise franchi. Les badges
 * attendent que le BFF les rattache à la partie (`resultat.md` § 8).
 */
function unlocksOf(result: GameResultView): Unlock[] {
  if (result.botGame) return []
  const unlocks: Unlock[] = []
  const delta = result.eloDelta ?? 0
  if (result.rated && delta > 0) {
    const from = tierOf(result.progression.rating - delta)
    const tier = tierOf(result.progression.rating)
    if (from !== tier) unlocks.push({ kind: 'rank', from, tier })
  }
  const { xp, xpGained } = result.topicMastery
  if (xpGained > 0) {
    const before = xp - xpGained
    const reachedBefore = before > 0 ? MASTERY_TIERS.indexOf(masteryOf(before)) : -1
    const reachedNow = MASTERY_TIERS.indexOf(masteryOf(xp))
    for (let index = reachedBefore + 1; index <= reachedNow; index += 1) {
      const tier = MASTERY_TIERS[index]
      if (tier) unlocks.push({ kind: 'title', tier })
    }
  }
  return unlocks
}

function streakOf(game: GameState, playerId: string | null): RoundResult[] {
  const rounds = sortedRounds(game)
  return Array.from({ length: ROUNDS }, (_, index) => {
    const bonus = isBonusRound(index)
    const answer = playerId ? rounds[index]?.playerAnswers[playerId] : undefined
    if (!rounds[index] || rounds[index]?.phase !== 'CLOSED') return 'unplayed'
    const correct = answer?.correct === true
    return bonus ? (correct ? 'bonusCorrect' : 'bonusWrong') : correct ? 'correct' : 'wrong'
  })
}

const BOT_LEVEL: Record<string, string> = { EASY: 'Niveau facile', NORMAL: 'Niveau normal', HARD: 'Niveau difficile' }

/**
 * Résultat d'un duel (`resultat.md`) : la séquence de déblocages d'abord (rang, titres), puis le résultat classé
 * (issue, Elo, maîtrise, revanche, nouvel adversaire, détails) ou d'entraînement. Toujours sombre.
 */
export function DuelResult({
  gameId,
  game,
  topic,
  topicId,
  category,
  celebrate = true,
}: {
  gameId: string
  game: GameState
  topic: string
  topicId?: string
  category?: string
  /** Faux pour une partie consultée depuis l'historique : les déblocages ont déjà été célébrés. */
  celebrate?: boolean
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const myName = me.data?.pseudonym ?? 'Moi'
  const cancelled = game.status === 'CANCELED'
  const result = useGameResult(gameId, !cancelled)
  const data = result.data
  const titles = useMyTitles()
  const wear = useWearTitle()
  const training = useStartTraining()
  const matchmaking = useStartMatchmaking()
  const difficulty = useBotDifficulty((state) => state.difficulty)
  const [step, setStep] = useState(0)
  const [sequenceDone, setSequenceDone] = useState(!celebrate)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)

  const isPlayer1 = game.player1Id === userId
  const opponentId = data?.opponentId ?? (isPlayer1 ? game.player2Id : game.player1Id)
  const bot = data?.botGame ?? game.player2Type === 'BOT'
  const opponentName = data?.opponent?.pseudonym ?? (isPlayer1 ? game.player2Name : game.player1Name) ?? (bot ? 'Robot' : 'Adversaire')
  const myScore = data?.myScore ?? (isPlayer1 ? game.player1Score : game.player2Score)
  const theirScore = data?.opponentScore ?? (isPlayer1 ? game.player2Score : game.player1Score)
  const winner = data?.winnerId ?? game.winnerId
  const outcome: MatchOutcome = game.forfeiterId === userId ? 'forfeit' : winner === null ? 'draw' : winner === userId ? 'win' : 'loss'
  const resolvedTopicId = data?.topic.topicId ?? topicId ?? game.topicId ?? ''
  const playTopic = { topicId: resolvedTopicId, name: topic, category }
  const rematch = useSendRematch({ userId, opponentId, topic: playTopic, gameId })
  // Elo à l'instant de la partie (snapshot du bilan) : une partie consultée plus tard ne doit pas afficher l'Elo
  // courant du profil. Le repli sur `/api/me` ne sert qu'avant l'arrivée du bilan.
  const gameProgression = data?.progression
  const rating = gameProgression?.rating ?? me.data?.progression?.rating ?? 0
  const myTier = gameProgression
    ? gameProgression.provisional
      ? undefined
      : tierOf(gameProgression.rating)
    : me.data?.progression && !me.data.progression.provisional
      ? tierOf(me.data.progression.rating)
      : undefined
  const opponentTier = data && data.opponentRated && data.opponentRating != null ? tierOf(data.opponentRating) : undefined
  const unlocks = celebrate && data && !sequenceDone ? unlocksOf(data) : []

  // ─── Séquence de déblocages ───
  const unlock = unlocks[step]
  if (unlock && data) {
    const last = step === unlocks.length - 1
    const next = () => (last ? setSequenceDone(true) : setStep(step + 1))
    const share = () =>
      void Share.share({
        message: unlock.kind === 'rank' ? `Je viens de passer ${tierLabel(unlock.tier)} sur Joutio !` : `Nouveau titre sur Joutio : ${topic}`,
      })
    let content
    if (unlock.kind === 'rank') {
      const nextTier = ORDER[ORDER.indexOf(unlock.tier) + 1]
      content = (
        <RankPromotion
          from={unlock.from}
          tier={unlock.tier}
          next={nextTier}
          name={myName}
          text="Ton cadre change sur ton profil et en duel."
          nextRule={nextTier ? `à ${formatNumber(tokens.tier[nextTier].minElo)}.` : undefined}
        />
      )
    } else {
      const key = `${resolvedTopicId}:${unlock.tier}`
      const nextTier = MASTERY_TIERS[MASTERY_TIERS.indexOf(unlock.tier) + 1]
      const name = data.topic.titles?.fr?.[unlock.tier] ?? `${tierLabel(unlock.tier)} · ${topic}`
      content = (
        <TitleUnlock
          tier={unlock.tier}
          title={name}
          topic={topic}
          text="Porte-le : il s'affiche sous ton nom, sur ton profil et en duel."
          next={nextTier}
          nextRule={nextTier ? `à ${formatNumber(MASTERY_XP[nextTier])} XP.` : undefined}
          worn={titles.data?.equippedKey === key}
          wearing={wear.isPending && wear.variables === key}
          onWear={() => wear.mutate(key)}
        />
      )
    }
    return (
      <UnlockSequence step={step} steps={unlocks.length} last={last} onContinue={next} onSkip={() => setSequenceDone(true)} onShare={share}>
        {content}
      </UnlockSequence>
    )
  }

  if (chatOpen) {
    const label = { win: 'victoire', loss: 'défaite', draw: 'égalité', forfeit: 'abandon' }[outcome]
    return (
      <ForceDark>
        <DuelChat opponentName={opponentName} recap={`${topic} · ${label} ${myScore} à ${theirScore}`} onBack={() => setChatOpen(false)} />
      </ForceDark>
    )
  }

  // ─── Résultat ───
  const nextTier = myTier ? ORDER[ORDER.indexOf(myTier) + 1] : undefined
  const nextElo = nextTier
    ? `${tierLabel(nextTier)} à ${formatNumber(tokens.tier[nextTier].minElo)}${tokens.tier[nextTier].minElo > rating ? ` · encore ${formatNumber(tokens.tier[nextTier].minElo - rating)}` : ''}`
    : undefined
  const mastery = data?.topicMastery
  const pendingReward = !data || data.reward === null

  return (
    <ForceDark>
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: insets.bottom + tokens.space[3] }}>
        <View style={{ height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.space[3] }}>
          <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
            {!bot && !cancelled && (
              <>
                <IconButton icon={ChatCircleIcon} label={`Message à ${opponentName}`} badge="dot" onPress={() => setChatOpen(true)} />
                {opponentId && !data?.opponentDeleted && <IconButton icon={FlagIcon} label={`Signaler ${opponentName}`} onPress={() => setReportOpen(true)} />}
              </>
            )}
          </View>
          <IconButton icon={XIcon} label="Quitter les résultats" onPress={() => router.back()} />
        </View>
        <View style={{ flex: 1, justifyContent: 'space-between', gap: tokens.space[5], paddingHorizontal: tokens.space[5], paddingBottom: tokens.space[3] }}>
          <ResultHeader
            outcome={cancelled ? 'draw' : outcome}
            topic={topic}
            me={{
              name: myName,
              tier: myTier,
              score: myScore,
              streak: streakOf(game, userId),
              meta: bot ? `Elo ${formatNumber(rating)} · non classé` : undefined,
            }}
            opponent={{
              name: opponentName,
              tier: opponentTier,
              score: theirScore,
              streak: streakOf(game, opponentId),
              meta: bot ? (BOT_LEVEL[data?.botDifficulty ?? game.botDifficulty ?? ''] ?? 'Robot') : undefined,
            }}
          />
          {bot || cancelled ? (
            <Banner
              tone="training"
              title={cancelled ? 'Partie annulée' : 'Entraînement'}
              message={cancelled ? 'Aucun point compté pour cette partie.' : "Pas d'expérience : la progression vient des duels contre d'autres joueurs."}
            />
          ) : (
            <>
              <EloSummary elo={rating} delta={data?.rated ? (data.eloDelta ?? 0) : 0} next={nextElo} />
              <MasteryRing
                tier={mastery ? tierLabel(mastery.tier as TierCode) : '—'}
                next={mastery?.nextTier ? tierLabel(mastery.nextTier as TierCode) : undefined}
                gained={mastery?.xpGained ?? 0}
                remaining={mastery?.tierRemainingXp ?? 0}
                size={150}
                state={pendingReward ? 'pending' : 'done'}
              />
            </>
          )}
          <View style={{ flexDirection: 'row', gap: tokens.space[3] }}>
            <View style={{ flex: 1 }}>
              {bot ? (
                <Button
                  full
                  icon={LightningIcon}
                  loading={training.isPending}
                  onPress={() => {
                    router.back()
                    training.mutate({ topic: playTopic, difficulty })
                  }}
                >
                  Rejouer
                </Button>
              ) : (
                <Button
                  full
                  icon={LightningIcon}
                  loading={rematch.state === 'pending' && rematch.seconds === 0}
                  disabled={rematch.state !== 'idle' || !opponentId}
                  onPress={() => void rematch.send()}
                >
                  {rematch.state === 'pending' && rematch.seconds > 0
                    ? `En attente · ${rematch.seconds} s`
                    : rematch.state === 'refused'
                      ? 'Revanche refusée'
                      : 'Revanche'}
                </Button>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Button
                full
                variant="gray"
                tone="neutral"
                loading={matchmaking.isPending}
                onPress={() => {
                  router.back()
                  matchmaking.mutate(playTopic)
                }}
              >
                Nouvel adversaire
              </Button>
            </View>
          </View>
        </View>
        {!cancelled && (
          <View style={{ alignItems: 'center' }}>
            <Button variant="plain" tone="neutral" size="M" icon={CaretUpIcon} onPress={() => setReviewOpen(true)}>
              Détails
            </Button>
          </View>
        )}
      </View>
      <DuelReview open={reviewOpen} onClose={() => setReviewOpen(false)} game={game} me={userId} myName={myName} opponentName={opponentName} canReport={!bot} />
      {opponentId && (
        <ReportPlayerSheet
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          userId={opponentId}
          name={opponentName}
          gameId={gameId}
          subtitle={`Ce duel · ${topic}`}
        />
      )}
    </ForceDark>
  )
}
