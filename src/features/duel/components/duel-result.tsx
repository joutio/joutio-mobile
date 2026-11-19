import { useShare } from '@/features/share'
import { router } from '@/shared/navigation/router'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  BadgeUnlock,
  Notice,
  Button,
  ChatCircleIcon,
  EloSummary,
  FlagIcon,
  AppTheme,
  IconButton,
  LightningIcon,
  MasteryRing,
  RankPromotion,
  ResultHeader,
  SwipeHint,
  StreakUnlock,
  TitleUnlock,
  tokens,
  UnlockSequence,
  useTheme,
  XIcon,
  type MatchOutcome,
  type RoundResult,
  type TierCode,
  TOP_BAR_HEIGHT,
  TopBannerFrame,
  useScreenTopInset,
} from '@/design-system'
import { useMe } from '@/features/me'
import { useBotDifficulty, useStartMatchmaking, useStartTraining } from '@/features/play/hooks/use-play'
import { useSendRematch } from '@/features/play/hooks/use-rematch'
import { useMyTitles, useWearTitle } from '@/features/topic/hooks/use-topic'
import { customTitle } from '@joutio/client/authoring'
import { formatNumber, MASTERY_TIERS, MASTERY_XP, tierLabel } from '@/features/topic/lib/format'
import type { BadgeView, MasteryTier } from '@joutio/client/api-types'
import { badgeUnlockOf } from '@/features/profile/lib/badges'
import { tierOf } from '@/shared/utils/tier'
import { sortedRounds } from '@joutio/client/game'
import { isBonusRound, ROUNDS } from '@joutio/client/game'
import type { GameState } from '@joutio/client/game'
import type { GameResultView } from '@joutio/client/game'
import { useGameResult, useStreakUnlock } from '../hooks/use-game'
import { nextStreakMilestone } from '@joutio/client/profile'
import { ResultPages } from './result-pages'
import { DuelReview, reviewRoundsOf } from './duel-review'
import { ReportPlayerSheet } from './report-sheets'
import { useMyAvatar } from '@/features/avatar/lib/avatar-preview'
import { usePlayerAvatar, usePlayerPremium } from '@/features/social/hooks/use-player-avatar'
import { usePlayerIdentity } from '@/features/me'
import { t, useLanguage, useT } from '@/lib/i18n'

/** Hauteur des pages sous laquelle le résultat passe en compact (`resultat.md` § 4 bis) : l'iPhone Duo plié y passe. */
const COMPACT_RESULT_HEIGHT = 640

/** Chat d'après-duel (écran mocké, le BFF n'a pas de messagerie) : masqué jusqu'à une prochaine itération (2026-11-13). */
const RESULT_CHAT_ENABLED = false

const ORDER = Object.keys(tokens.tier) as TierCode[]
const masteryOf = (xp: number): MasteryTier => MASTERY_TIERS.reduce<MasteryTier>((best, tier) => (xp >= MASTERY_XP[tier] ? tier : best), 'FER')

type Unlock =
  | { kind: 'streak'; days: number }
  | { kind: 'rank'; from: TierCode; tier: TierCode }
  | { kind: 'title'; tier: MasteryTier }
  | { kind: 'badge'; badge: BadgeView }

/**
 * Déblocages de la partie, dans l'ordre de la spec (série, rang, titres, puis badges). Série : première partie classée
 * du jour (2026-11-13). Rang : palier d'Elo avant / après. Titres : chaque palier de maîtrise franchi. Badges : ceux
 * que le BFF rattache à la partie (`GameResultView.badges`).
 */
function unlocksOf(result: GameResultView, streakDays: number | null): Unlock[] {
  if (result.botGame) return []
  const unlocks: Unlock[] = streakDays ? [{ kind: 'streak', days: streakDays }] : []
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
  for (const badge of result.badges ?? []) unlocks.push({ kind: 'badge', badge })
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

const BOT_LEVEL = (): Record<string, string> => ({ EASY: t('result.botEasy'), NORMAL: t('result.botNormal'), HARD: t('result.botHard') })

/**
 * Résultat d'un duel (`resultat.md`) : la séquence de déblocages d'abord (série, rang, titres, badges), puis le résultat classé
 * (issue, Elo, maîtrise, revanche, nouvel adversaire, détails) ou d'entraînement.
 */
interface DuelResultProps {
  gameId: string
  game: GameState
  topic: string
  topicId?: string
  category?: string
  /** Faux pour une partie consultée depuis l'historique : les déblocages ont déjà été célébrés. */
  celebrate?: boolean
}

/**
 * Le résultat suit le thème du joueur (décision du 2026-11-13), y compris quand il s'affiche dans l'arène, toujours
 * sombre : `AppTheme` lui rend le thème de l'app. Seule la séquence de déblocages reste sombre (`UnlockSequence`).
 */
export function DuelResult(props: DuelResultProps) {
  return (
    <AppTheme>
      <DuelResultContent {...props} />
    </AppTheme>
  )
}

function DuelResultContent({ gameId, game, topic, topicId, category, celebrate = true }: DuelResultProps) {
  const t = useT()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const screenTop = useScreenTopInset()
  const me = useMe(true)
  const userId = me.data?.userId ?? ''
  const language = useLanguage()
  const myName = me.data?.pseudonym ?? t('common.me')
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
  const [reportOpen, setReportOpen] = useState(false)
  // Deux pages verticales fixes (résultat, Détails du duel), hauteur mesurée sous la barre.
  const [pageHeight, setPageHeight] = useState(0)
  // Zone des pages trop courte (iPhone Duo plié) : résultat compact (`resultat.md` § 4 bis).
  const compact = pageHeight > 0 && pageHeight < COMPACT_RESULT_HEIGHT
  const [page, setPage] = useState(0)
  const hasReview = useMemo(() => !cancelled && reviewRoundsOf(game).length > 0, [cancelled, game])

  const isPlayer1 = game.player1Id === userId
  const opponentId = data?.opponentId ?? (isPlayer1 ? game.player2Id : game.player1Id)
  const bot = data?.botGame ?? game.player2Type === 'BOT'
  const opponentName = data?.opponent?.pseudonym ?? (isPlayer1 ? game.player2Name : game.player1Name) ?? (bot ? t('topic.bot') : t('topic.opponent'))
  const myScore = data?.myScore ?? (isPlayer1 ? game.player1Score : game.player2Score)
  const theirScore = data?.opponentScore ?? (isPlayer1 ? game.player2Score : game.player1Score)
  const winner = data?.winnerId ?? game.winnerId
  const outcome: MatchOutcome = game.forfeiterId === userId ? 'forfeit' : winner === null ? 'draw' : winner === userId ? 'win' : 'loss'
  const resolvedTopicId = data?.topic.topicId ?? topicId ?? game.topicId ?? ''
  const playTopic = { topicId: resolvedTopicId, name: topic, category }
  const rematch = useSendRematch({ userId, opponentId, topic: playTopic, gameId })
  const myAvatar = useMyAvatar()
  const shareLink = useShare()
  const opponentAvatar = usePlayerAvatar(opponentId, !bot)
  const opponentPremium = usePlayerPremium(opponentId, !bot)
  const identity = usePlayerIdentity()
  // Elo à l'instant de la partie (snapshot du bilan) : une partie consultée plus tard ne doit pas afficher l'Elo
  // courant du profil. Le repli sur `/api/me` ne sert qu'avant l'arrivée du bilan.
  const gameProgression = data?.progression
  const rating = gameProgression?.rating ?? me.data?.progression?.rating ?? 0
  const myTier = gameProgression ? tierOf(gameProgression.rating) : me.data?.progression ? tierOf(me.data.progression.rating) : undefined
  const opponentTier = data && data.opponentRated && data.opponentRating != null ? tierOf(data.opponentRating) : undefined
  // La série est lue avant d'ouvrir la séquence : son écran vient en premier et ne doit pas s'insérer en cours de route.
  const streak = useStreakUnlock(gameId, userId, celebrate && !bot)
  const streakPending = celebrate && !sequenceDone && !bot && !streak.isFetched
  const unlocks = celebrate && data && !sequenceDone && !streakPending ? unlocksOf(data, streak.data ?? null) : []

  // ─── Séquence de déblocages : une page par déblocage, balayables ───
  if (unlocks.length > 0 && data) {
    const current = unlocks[Math.min(step, unlocks.length - 1)]
    const share = () =>
      current &&
      shareLink({
        kind: 'topic',
        id: resolvedTopicId,
        message:
          current.kind === 'streak'
            ? t('result.shareStreak', { days: current.days })
            : current.kind === 'rank'
              ? t('result.shareRank', { tier: tierLabel(current.tier) })
              : current.kind === 'badge'
                ? t('result.shareBadge', { badge: badgeUnlockOf(current.badge, t).name })
                : t('result.shareTitle', { topic }),
      })
    const pages = unlocks.map((unlock) => {
      if (unlock.kind === 'streak')
        return <StreakUnlock key="streak" days={unlock.days} nextRule={nextStreakMilestone(unlock.days) === 7 ? t('result.streakMicah') : undefined} />
      if (unlock.kind === 'rank') {
        const nextTier = ORDER[ORDER.indexOf(unlock.tier) + 1]
        return (
          <RankPromotion
            key={`rank-${unlock.tier}`}
            from={unlock.from}
            tier={unlock.tier}
            next={nextTier}
            name={myName}
            src={myAvatar}
            text={t('result.rankText')}
            nextRule={nextTier ? t('result.rankNext', { elo: formatNumber(tokens.tier[nextTier].minElo) }) : undefined}
          />
        )
      }
      if (unlock.kind === 'badge') {
        const shown = badgeUnlockOf(unlock.badge, t)
        return (
          <BadgeUnlock key={`badge-${unlock.badge.code}`} tier={unlock.badge.tier} badge={shown.name} family={shown.family} icon={shown.icon} text={shown.text} />
        )
      }
      const key = `${resolvedTopicId}:${unlock.tier}`
      const nextTier = MASTERY_TIERS[MASTERY_TIERS.indexOf(unlock.tier) + 1]
      const name = customTitle(data.topic.titles, unlock.tier, language) ?? t('workshop.tierTitle', { tier: tierLabel(unlock.tier), topic })
      return (
        <TitleUnlock
          key={`title-${unlock.tier}`}
          tier={unlock.tier}
          title={name}
          topic={topic}
          text={t('result.titleText')}
          next={nextTier}
          nextRule={nextTier ? t('result.titleNext', { xp: formatNumber(MASTERY_XP[nextTier]) }) : undefined}
          worn={titles.data?.equippedKey === key}
          wearing={wear.isPending && wear.variables === key}
          onWear={() => wear.mutate(key)}
        />
      )
    })
    return (
      <TopBannerFrame style={{ backgroundColor: colors.bg }}>
        <UnlockSequence pages={pages} step={step} onStepChange={setStep} onDone={() => setSequenceDone(true)} onShare={share} />
      </TopBannerFrame>
    )
  }

  // ─── Résultat ───
  const outcomeLabel = { win: t('result.win'), loss: t('mobile.result.loss'), draw: t('mobile.result.draw'), forfeit: t('result.forfeit') }[outcome]
  const chatRecap = t('result.chatRecap', { topic, outcome: outcomeLabel, mine: myScore, theirs: theirScore })
  const nextTier = myTier ? ORDER[ORDER.indexOf(myTier) + 1] : undefined
  const nextElo = nextTier
    ? tokens.tier[nextTier].minElo > rating
      ? t('result.nextEloLeft', {
          tier: tierLabel(nextTier),
          elo: formatNumber(tokens.tier[nextTier].minElo),
          left: formatNumber(tokens.tier[nextTier].minElo - rating),
        })
      : t('result.nextElo', { tier: tierLabel(nextTier), elo: formatNumber(tokens.tier[nextTier].minElo) })
    : undefined
  const mastery = data?.topicMastery
  const pendingReward = !data || data.reward === null
  const eloSummary = (
    <EloSummary
      compact={compact}
      elo={rating}
      delta={data?.rated ? (data.eloDelta ?? 0) : 0}
      // Écran court : sans le prochain rang, la place manque (2026-11-14).
      next={compact ? undefined : nextElo}
    />
  )
  const masteryRing = (
    <MasteryRing
      tier={mastery ? tierLabel(mastery.tier as TierCode) : '—'}
      next={mastery?.nextTier ? tierLabel(mastery.nextTier as TierCode) : undefined}
      gained={mastery?.xpGained ?? 0}
      remaining={mastery?.tierRemainingXp ?? 0}
      size={compact ? 104 : 150}
      compact={compact}
      state={pendingReward ? 'pending' : 'done'}
    />
  )

  return (
    <>
      <TopBannerFrame style={{ backgroundColor: colors.bg }}>
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: screenTop }}>
          <View
            style={{ height: TOP_BAR_HEIGHT, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: tokens.space[3] }}
          >
            <View style={{ flexDirection: 'row', gap: tokens.space[2] }}>
              {!bot && !cancelled && (
                <>
                  {RESULT_CHAT_ENABLED && (
                    <IconButton
                      icon={ChatCircleIcon}
                      label={t('mobile.result.messageTo', { name: opponentName })}
                      badge="dot"
                      onPress={() =>
                        router.push({
                          pathname: '/result/[gameId]/chat',
                          params: { gameId, opponentName, recap: chatRecap },
                        })
                      }
                    />
                  )}
                  {opponentId && !data?.opponentDeleted && (
                    <IconButton icon={FlagIcon} label={t('result.reportPlayer', { name: opponentName })} onPress={() => setReportOpen(true)} />
                  )}
                </>
              )}
            </View>
            <IconButton icon={XIcon} label={t('result.quit')} onPress={() => router.back()} />
          </View>
          <View style={{ flex: 1 }} onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}>
            {pageHeight > 0 && (
              <ResultPages height={pageHeight} page={page} onPageChange={setPage} enabled={hasReview}>
                {/* Page 1 : le résultat, jamais de défilement ni de débordement (le geste vertical ouvre les détails). */}
                <View style={{ flex: 1, overflow: 'hidden', paddingBottom: hasReview ? 0 : insets.bottom + tokens.space[3] }}>
                  <View style={{ flex: 1, justifyContent: 'space-between', gap: tokens.space[5], paddingHorizontal: tokens.space[5] }}>
                    <ResultHeader
                      outcome={cancelled ? 'draw' : outcome}
                      topic={topic}
                      me={{
                        name: myName,
                        src: myAvatar,
                        tier: myTier,
                        score: myScore,
                        streak: streakOf(game, userId),
                        premium: identity.myPremium,
                        onOpen: identity.open(userId),
                      }}
                      opponent={{
                        name: opponentName,
                        src: opponentAvatar,
                        tier: opponentTier,
                        score: theirScore,
                        streak: streakOf(game, opponentId),
                        meta: bot ? (BOT_LEVEL()[data?.botDifficulty ?? game.botDifficulty ?? ''] ?? t('topic.bot')) : undefined,
                        premium: !bot && opponentPremium,
                        // Le robot et un compte supprimé n'ont pas de fiche.
                        onOpen: bot || data?.opponentDeleted ? undefined : identity.open(opponentId),
                      }}
                    />
                    {bot || cancelled ? (
                      <Notice
                        tone="training"
                        title={cancelled ? t('result.cancelled') : t('room.training')}
                        message={cancelled ? t('result.cancelledText') : t('result.trainingText')}
                      />
                    ) : // Écran court : l'Elo et la maîtrise côte à côte, sans jamais passer à la ligne (la page ne défile pas) ; sinon deux blocs répartis dans la page.
                    compact ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space[4] }}>
                        {eloSummary}
                        {masteryRing}
                      </View>
                    ) : (
                      <>
                        {eloSummary}
                        {masteryRing}
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
                            {t('result.replay')}
                          </Button>
                        ) : (
                          <Button
                            full
                            icon={LightningIcon}
                            loading={rematch.sending}
                            disabled={rematch.state !== 'idle' || !opponentId}
                            onPress={() => void rematch.send()}
                          >
                            {rematch.state === 'pending' && rematch.seconds > 0
                              ? t('result.rematchWaiting', { seconds: rematch.seconds })
                              : rematch.state === 'refused'
                                ? t('result.rematchRefused')
                                : t('result.rematch')}
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
                          {t('result.newOpponent')}
                        </Button>
                      </View>
                    </View>
                  </View>
                  {hasReview && (
                    <SwipeHint
                      direction="up"
                      title={t('result.details')}
                      hint={t('result.swipeUp')}
                      label={t('result.openDetails')}
                      accessibilityHint={t('mobile.result.reviewA11y')}
                      bottomInset={insets.bottom}
                      onPress={() => setPage(1)}
                    />
                  )}
                </View>
                {/* Page 2 : Détails du duel. */}
                {hasReview ? (
                  <View style={{ flex: 1, paddingBottom: insets.bottom + tokens.space[3] }}>
                    <DuelReview game={game} me={userId} myName={myName} opponentName={opponentName} canReport compact={compact} />
                  </View>
                ) : null}
              </ResultPages>
            )}
          </View>
        </View>
      </TopBannerFrame>
      {opponentId && (
        <ReportPlayerSheet
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          userId={opponentId}
          name={opponentName}
          gameId={gameId}
          subtitle={t('result.reportContext', { topic })}
        />
      )}
    </>
  )
}
