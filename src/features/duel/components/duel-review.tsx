import PagerView, { type PagerViewRef } from '@expo/ui/community/pager-view'
import { Image } from 'expo-image'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View } from 'react-native'
import {
  AnswerTimingRow,
  Button,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  FlagIcon,
  IconButton,
  PageDots,
  QuestionBlock,
  RoundReviewTabs,
  Text,
  tokens,
  useTheme,
  type AnswerCardProps,
  type ReviewAnswer,
  type ReviewRoundTab,
} from '@/design-system'
import { sortedRounds } from '@joutio/client-domain/game'
import { localizedQuestion, type GameRoundState, type GameState } from '@joutio/client-domain/game'
import { ReportQuestionSheet } from './report-sheets'

const GUTTER = tokens.space[5]

/** Manches jouées à revoir : sans aucune, le résultat n'a pas de page « Détails du duel ». */
export const reviewRoundsOf = (game: GameState): GameRoundState[] => sortedRounds(game).filter((round) => round.phase === 'CLOSED')

const answerOf = (round: GameRoundState, playerId: string | null): ReviewAnswer => {
  const answer = playerId ? round.playerAnswers[playerId] : undefined
  if (!answer) return 'none'
  return answer.correct ? 'correct' : 'wrong'
}

interface ReviewPageProps {
  round: GameRoundState
  me: string
  opponent: string | null
  myName: string
  opponentName: string
}

/** Une manche rejouée. Mémoïsée : changer de question ou de detent ne la re-rend pas. */
const ReviewPage = memo(function ReviewPage({ round, me, opponent, myName, opponentName }: ReviewPageProps) {
  const { colors } = useTheme()
  const { questionText, answers } = localizedQuestion(round, 'fr')
  const mine = round.playerAnswers[me]
  const theirs = opponent ? round.playerAnswers[opponent] : undefined
  const first = mine && (!theirs || mine.timeMs <= theirs.timeMs) ? 'me' : theirs ? 'opponent' : undefined
  const cards = useMemo<(AnswerCardProps & { key: string })[]>(
    () =>
      Object.keys(answers)
        .sort()
        .map((choice) => {
          const isMine = mine?.choice === choice
          const isTheirs = theirs?.choice === choice
          return {
            key: choice,
            label: answers[choice] ?? '',
            state: choice === round.correctAnswer ? 'correct' : isMine || isTheirs ? 'wrong' : 'unchosen',
            notch: isMine && isTheirs ? 'both' : isMine ? 'me' : isTheirs ? 'opp' : 'none',
          }
        }),
    [answers, mine?.choice, theirs?.choice, round.correctAnswer],
  )
  return (
    <View style={{ flex: 1, gap: tokens.space[4], paddingHorizontal: GUTTER }}>
      <AnswerTimingRow
        first={first}
        me={{ name: myName, seconds: mine ? mine.timeMs / 1000 : undefined, points: mine?.points ?? 0 }}
        opponent={{ name: opponentName, seconds: theirs ? theirs.timeMs / 1000 : undefined, points: theirs?.points ?? 0 }}
      />
      <View style={{ flex: 1, minHeight: 0 }}>
        <QuestionBlock text={questionText} image={round.imageUrl ?? undefined} layout="2x2" answers={cards} notchColor={colors.bg} />
      </View>
    </View>
  )
})

/**
 * « Détails du duel » (`resultat.md` § 6) : seconde page verticale du résultat, sous la barre fixe. Onglets des
 * manches, temps de réponse, question rejouée avec ses réponses (mêmes ratios que le duel, image réduite à la place
 * disponible), page dots et flèches ; on balaie entre les questions (pager natif Expo UI). « Signaler la question »
 * ouvre sa feuille. Pseudonymes partout, jamais « toi ».
 *
 * <p>Le composant reste monté avec le résultat : la question consultée est conservée d'une page à l'autre, et les
 * images sont préchargées dès l'ouverture du résultat.</p>
 */
export const DuelReview = memo(function DuelReview({
  game,
  me,
  myName,
  opponentName,
  canReport,
}: {
  game: GameState
  me: string
  myName: string
  opponentName: string
  canReport: boolean
}) {
  const rounds = useMemo(() => reviewRoundsOf(game), [game])
  const images = useMemo(() => [...new Set(rounds.map((round) => round.imageUrl).filter((url): url is string => Boolean(url)))], [rounds])
  const opponent = game.player1Id === me ? game.player2Id : game.player1Id
  const [index, setIndex] = useState(0)
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState<readonly number[]>([])
  const pager = useRef<PagerViewRef>(null)

  useEffect(() => {
    if (images.length === 0) return
    void Promise.all(images.map((url) => Image.prefetch(url))).catch(() => undefined)
  }, [images])

  const tabs = useMemo<ReviewRoundTab[]>(
    () => rounds.map((item) => ({ me: answerOf(item, me), opponent: answerOf(item, opponent), points: item.playerAnswers[me]?.points ?? 0 })),
    [rounds, me, opponent],
  )
  // Pages stables : le pager reçoit les mêmes enfants tant que la partie ne change pas.
  const pages = useMemo(
    () =>
      rounds.map((item) => (
        <View key={String(item.round)} style={{ flex: 1 }}>
          <ReviewPage round={item} me={me} opponent={opponent} myName={myName} opponentName={opponentName} />
        </View>
      )),
    [rounds, me, opponent, myName, opponentName],
  )

  const count = rounds.length
  const go = useCallback(
    (next: number) => {
      const target = Math.min(count - 1, Math.max(0, next))
      setIndex(target)
      pager.current?.setPage(target)
    },
    [count],
  )

  if (count === 0) return null

  const round = rounds[index]
  const done = reported.includes(index)

  return (
    <>
      <View style={{ flex: 1, gap: tokens.space[4] }}>
        <View style={{ gap: tokens.space[4], paddingHorizontal: GUTTER }}>
          <Text variant="headline" accessibilityRole="header">
            Détails du duel
          </Text>
          <RoundReviewTabs me={myName} opponent={opponentName} value={index} onChange={go} rounds={tabs} />
        </View>
        <PagerView ref={pager} style={{ flex: 1 }} initialPage={0} onPageSelected={(event) => setIndex(event.nativeEvent.position)}>
          {pages}
        </PagerView>
        <View style={{ gap: tokens.space[3], paddingHorizontal: GUTTER }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <IconButton icon={CaretLeftIcon} label="Question précédente" variant="gray" disabled={index === 0} onPress={() => go(index - 1)} />
            <PageDots count={count} index={index} />
            <IconButton icon={CaretRightIcon} label="Question suivante" variant="gray" disabled={index >= count - 1} onPress={() => go(index + 1)} />
          </View>
          {canReport && (
            <Button variant="plain" tone="neutral" size="M" full icon={done ? CheckIcon : FlagIcon} disabled={done} onPress={() => setReportOpen(true)}>
              {done ? 'Question signalée' : 'Signaler la question'}
            </Button>
          )}
        </View>
      </View>
      <ReportQuestionSheet
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={round?.questionId ?? null}
        gameId={game.gameId}
        hasImage={Boolean(round?.imageUrl)}
        subtitle={`Question ${index + 1} sur ${count}`}
        onSent={() => setReported([...reported, index])}
      />
    </>
  )
})
