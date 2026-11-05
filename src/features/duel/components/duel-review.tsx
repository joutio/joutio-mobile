import { Image } from 'expo-image'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ScrollView, useWindowDimensions, View, type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  AnswerTimingRow,
  Button,
  CaretLeftIcon,
  CaretRightIcon,
  CheckIcon,
  FlagIcon,
  IconButton,
  PageDots,
  PeekSheet,
  QuestionBlock,
  RoundReviewTabs,
  tokens,
  useTheme,
  type AnswerCardProps,
  type ReviewAnswer,
} from '@/design-system'
import { sortedRounds } from '../domain/arena-timeline'
import { localizedQuestion, type GameRoundState, type GameState } from '../domain/game'
import { ReportQuestionSheet } from './report-sheets'

const answerOf = (round: GameRoundState, playerId: string | null): ReviewAnswer => {
  const answer = playerId ? round.playerAnswers[playerId] : undefined
  if (!answer) return 'none'
  return answer.correct ? 'correct' : 'wrong'
}

function ReviewPage({
  round,
  me,
  opponent,
  myName,
  opponentName,
  width,
  height,
}: {
  round: GameRoundState
  me: string
  opponent: string | null
  myName: string
  opponentName: string
  width: number
  height: number
}) {
  const { colors } = useTheme()
  const { questionText, answers } = localizedQuestion(round, 'fr')
  const mine = round.playerAnswers[me]
  const theirs = opponent ? round.playerAnswers[opponent] : undefined
  const first = mine && (!theirs || mine.timeMs <= theirs.timeMs) ? 'me' : theirs ? 'opponent' : undefined
  const cards: (AnswerCardProps & { key: string })[] = Object.keys(answers)
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
    })
  return (
    <View style={{ width, height, gap: tokens.space[4], paddingHorizontal: tokens.space[5] }}>
      <AnswerTimingRow
        first={first}
        me={{ name: myName, seconds: mine ? mine.timeMs / 1000 : undefined, points: mine?.points ?? 0 }}
        opponent={{ name: opponentName, seconds: theirs ? theirs.timeMs / 1000 : undefined, points: theirs?.points ?? 0 }}
      />
      <View style={{ flex: 1, minHeight: 0 }}>
        <QuestionBlock text={questionText} image={round.imageUrl ?? undefined} fitImage layout="2x2" answers={cards} notchColor={colors.surface} />
      </View>
    </View>
  )
}

/**
 * « Détails du duel » (`resultat.md` § 6) : feuille persistante en `peek`, agrandie au glissement. Onglets des
 * manches, temps de réponse, question rejouée avec ses réponses (mêmes ratios que le duel, image réduite à la place
 * disponible), page dots et flèches ; on balaie entre les questions. « Signaler la question » empile sa feuille.
 * Pseudonymes partout, jamais « toi ».
 */
export function DuelReview({
  game,
  me,
  myName,
  opponentName,
  canReport,
  active = true,
}: {
  game: GameState
  me: string
  myName: string
  opponentName: string
  canReport: boolean
  /** Écran au premier plan : la feuille se retire quand le chat est poussé par-dessus. */
  active?: boolean
}) {
  const { width, height } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  const rounds = useMemo(() => sortedRounds(game).filter((round) => round.phase === 'CLOSED'), [game])
  const images = useMemo(() => [...new Set(rounds.map((round) => round.imageUrl).filter((url): url is string => Boolean(url)))], [rounds])
  const opponent = game.player1Id === me ? game.player2Id : game.player1Id
  const [expanded, setExpanded] = useState(false)
  const [index, setIndex] = useState(0)
  // Hauteur de repli immédiate : le pager se monte avant la première mesure, sinon l'agrandissement affiche un vide.
  const [pageHeight, setPageHeight] = useState(() => Math.max(280, height * 0.92 - 360))
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState<readonly number[]>([])
  const pager = useRef<ScrollViewInstance>(null)

  // Les images sont préchargées dès le montage de la revue : l'agrandissement n'attend pas le réseau.
  useEffect(() => {
    if (images.length === 0) return
    void Promise.all(images.map((url) => Image.prefetch(url))).catch(() => undefined)
  }, [images])

  // La question consultée est conservée quand la feuille est repliée puis rouverte : pas de retour forcé à Q1.
  if (rounds.length === 0) return null

  const go = (next: number) => {
    const target = Math.min(rounds.length - 1, Math.max(0, next))
    setIndex(target)
    pager.current?.scrollTo({ x: target * width, animated: true })
  }
  const round = rounds[index]
  const done = reported.includes(index)
  const subtitle = rounds.length > 0 ? `Question ${index + 1} sur ${rounds.length}` : undefined

  return (
    <>
      <PeekSheet title="Détails du duel" subtitle={subtitle} active={active} onExpandedChange={setExpanded}>
        <View style={{ flex: 1, gap: tokens.space[3], paddingBottom: insets.bottom + tokens.space[4] }}>
          <View style={{ paddingHorizontal: tokens.space[5] }}>
            <RoundReviewTabs
              me={myName}
              opponent={opponentName}
              value={index}
              onChange={go}
              rounds={rounds.map((item) => ({ me: answerOf(item, me), opponent: answerOf(item, opponent), points: item.playerAnswers[me]?.points ?? 0 }))}
            />
          </View>
          <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}>
            <ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              scrollsToTop={false}
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1, overflow: 'hidden' }}
              contentOffset={{ x: index * width, y: 0 }}
              onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
            >
              {rounds.map((item) => (
                <ReviewPage
                  key={item.round}
                  round={item}
                  me={me}
                  opponent={opponent}
                  myName={myName}
                  opponentName={opponentName}
                  width={width}
                  height={pageHeight}
                />
              ))}
            </ScrollView>
          </View>
          <View style={{ gap: tokens.space[3], paddingHorizontal: tokens.space[5], paddingTop: tokens.space[4] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <IconButton icon={CaretLeftIcon} label="Question précédente" variant="gray" disabled={index === 0} onPress={() => go(index - 1)} />
              <PageDots count={rounds.length} index={index} />
              <IconButton icon={CaretRightIcon} label="Question suivante" variant="gray" disabled={index >= rounds.length - 1} onPress={() => go(index + 1)} />
            </View>
            {canReport && (
              <Button variant="plain" tone="neutral" size="M" full icon={done ? CheckIcon : FlagIcon} disabled={done} onPress={() => setReportOpen(true)}>
                {done ? 'Question signalée' : 'Signaler la question'}
              </Button>
            )}
          </View>
        </View>
      </PeekSheet>
      <ReportQuestionSheet
        open={expanded && reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={round?.questionId ?? null}
        gameId={game.gameId}
        hasImage={Boolean(round?.imageUrl)}
        subtitle={`Question ${index + 1} sur ${rounds.length}`}
        onSent={() => setReported([...reported, index])}
      />
    </>
  )
}
