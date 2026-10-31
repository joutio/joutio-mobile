import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useNetworkState } from "expo-network";
import { Image } from "expo-image";
import { Lightning, UserCircleDashed, WifiSlash } from "phosphor-react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/features/auth/hooks/useMe";
import { useTopicOverview } from "@/features/topic/hooks/useTopicDetail";
import { haptic } from "@/lib/haptics";
import { leaveDuelFlow } from "@/lib/navigation";
import { gamesService } from "@/lib/services/games";
import { queryKeys } from "@/lib/query-keys";
import { showToast } from "@/lib/toast";
import { useReached } from "@/shared/hooks/useReached";
import { eloTier } from "@/shared/utils/elo";
import { topicName } from "@/shared/utils/topic-name";
import type { GameChoice } from "@/shared/types/bff";
import { AppButton } from "@/ui/button";
import { JoBanner } from "@/ui/jo/jo-banner";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { AppText } from "@/ui/text";
import { EASE, EASE_POP, gainFloat, popIn, questionIn } from "@/ui/motion";
import { tierLabel } from "@/ui/tokens";
import { DarkTheme } from "@/ui/theme";
import { AnswerCard, type AnswerState } from "./components/answer-card";
import {
  DuelScoreboard,
  SCORE_COLOR,
  SecondsLeft,
  type ScoreTone,
} from "./components/duel-scoreboard";
import { FaceOff } from "./components/face-off";
import { RoundIntro } from "./components/round-intro";
import { TimerBar } from "./components/timer-bar";
import {
  localizedQuestion,
  revealedScore,
  roundDots,
  roundNumber,
} from "./domain/game";
import { useGameState } from "./hooks/useGameState";

const CHOICES: GameChoice[] = ["A", "B", "C", "D"];
const ROUND_MS = 10_000;
const ROUND_INTRO_MS = 1_900;
const LOW_TIME_MS = 3_000;
const MAX_SCORE = 160;
const BG = "#0B0B0B";

function Gauge({
  score,
  tone,
  side,
}: {
  score: number;
  tone: ScoreTone;
  side: "left" | "right";
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: MAX_SCORE, now: score }}
      style={[styles.gauge, side === "left" ? styles.gaugeLeft : styles.gaugeRight]}
    >
      <Animated.View
        style={{
          flex: 1,
          transformOrigin: "50% 100%",
          transform: [{ scaleY: Math.min(1, score / MAX_SCORE) }],
          backgroundColor: SCORE_COLOR[tone],
          transitionProperty: ["transform", "backgroundColor"],
          transitionDuration: [900, 300],
          transitionTimingFunction: ["linear", EASE],
        }}
      />
    </View>
  );
}

function ArenaScreen() {
  const { gameId = "" } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useMe();
  const userId = me.data?.userId ?? null;
  const language = me.data?.language ?? "fr";
  const { game, isLoading, isError, refresh } = useGameState(gameId);
  const topicQuery = useTopicOverview(game.topicId ?? "");
  const network = useNetworkState();
  const offline = network.isConnected === false;
  const wasOffline = useRef(false);

  const [pendingRound, setPendingRound] = useState<string | null>(null);
  const [pendingChoice, setPendingChoice] = useState<GameChoice | null>(null);
  const [quitOpen, setQuitOpen] = useState(false);
  const warnedRound = useRef<string | null>(null);
  const revealedRound = useRef<string | null>(null);

  const answer = useMutation({
    mutationFn: (choice: GameChoice) => gamesService.answer(gameId, choice),
    retry: (failureCount, error) => {
      const status = (error as { statusCode?: number }).statusCode;
      if (status && status >= 400 && status < 500 && status !== 408) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 600,
    onError: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.games.notifications(gameId),
      });
      setPendingRound(null);
      setPendingChoice(null);
      showToast({
        title: "Réponse non envoyée",
        description: "Vérifie ta connexion et réessaie.",
        tone: "danger",
      });
    },
  });

  const currentRound = game.currentRound
    ? (game.rounds[game.currentRound] ?? null)
    : null;
  const localized = useMemo(
    () => localizedQuestion(currentRound, language),
    [currentRound, language],
  );
  const isPlayer1 = game.player1Id === userId;
  const opponentId = isPlayer1 ? game.player2Id : game.player1Id;
  const vsBot = game.player2Type === "BOT";
  const myName = me.data?.pseudonym ?? "Toi";
  const opponentName = vsBot
    ? "Bot"
    : ((isPlayer1 ? game.player2Name : game.player1Name) ?? "Adversaire");
  const myScore = revealedScore(game, userId);
  const theirScore = revealedScore(game, opponentId);
  const myAnswer = userId ? (currentRound?.playerAnswers[userId] ?? null) : null;
  const theirAnswer = opponentId
    ? (currentRound?.playerAnswers[opponentId] ?? null)
    : null;
  const correctAnswer = currentRound?.correctAnswer ?? null;
  const revealed = correctAnswer !== null;
  const selectedChoice =
    myAnswer?.choice ??
    (pendingRound === currentRound?.round ? pendingChoice : null);
  // `revealAt` est connu dès le début du round : le sondage ne retarde pas l'ouverture.
  const revealAt = currentRound?.revealAt
    ? Date.parse(currentRound.revealAt)
    : null;
  const revealReached = useReached(revealAt);
  const answersOpen =
    currentRound?.phase === "ANSWERABLE" ||
    currentRound?.phase === "CLOSED" ||
    revealReached;
  const isAnswerable =
    answersOpen &&
    !revealed &&
    !myAnswer &&
    pendingRound !== currentRound?.round;

  const deadline = currentRound?.answerDeadlineAt
    ? Date.parse(currentRound.answerDeadlineAt)
    : revealAt
      ? revealAt + ROUND_MS
      : null;
  const low =
    useReached(deadline ? deadline - LOW_TIME_MS : null) &&
    answersOpen &&
    !revealed;

  // L'annonce occupe la fin de la transition serveur, avant le round suivant.
  const nextRoundAt = currentRound
    ? currentRound.phase === "CLOSED"
      ? currentRound.nextRoundAt
      : null
    : game.firstRoundAt;
  const introReached = useReached(
    nextRoundAt ? Date.parse(nextRoundAt) - ROUND_INTRO_MS : null,
  );

  useEffect(() => {
    if (myAnswer) {
      setPendingRound(null);
      setPendingChoice(null);
    }
  }, [myAnswer]);

  useEffect(() => {
    if (game.status === "FINISHED") {
      router.replace(`/(app)/duel/result/${gameId}`);
    }
  }, [game.status, gameId, router]);

  useEffect(() => {
    const round = currentRound?.round ?? null;
    if (low && !myAnswer && round && warnedRound.current !== round) {
      warnedRound.current = round;
      haptic("warning");
    }
  }, [currentRound?.round, low, myAnswer]);

  useEffect(() => {
    const round = currentRound?.round ?? null;
    if (revealed && myAnswer && round && revealedRound.current !== round) {
      revealedRound.current = round;
      haptic(myAnswer.correct ? "success" : "error");
    }
  }, [currentRound?.round, myAnswer, revealed]);

  useEffect(() => {
    if (offline === wasOffline.current) return;
    wasOffline.current = offline;
    haptic(offline ? "warning" : "success");
  }, [offline]);

  const running = game.status === "IN_PROGRESS" && !isError;
  useEffect(() => {
    if (!running) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      haptic("warning");
      setQuitOpen(true);
      return true;
    });
    return () => subscription.remove();
  }, [running]);

  const leave = () => leaveDuelFlow(router);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
        <AppText variant="callout" style={styles.muted}>
          Préparation du duel…
        </AppText>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.center}>
        <AppText variant="headline">Duel indisponible</AppText>
        <AppButton label="Réessayer" variant="secondary" onPress={refresh} />
        <AppButton label="Retour" variant="plain" onPress={leave} />
      </View>
    );
  }

  if (game.status === "CANCELED") {
    return (
      <View style={styles.center}>
        <JoEmptyState
          icon={<UserCircleDashed size={36} color="#E8B04A" weight="fill" />}
          title="Adversaire absent"
          message="La partie n'a jamais démarré : un joueur ne s'est pas présenté. Rien ne change pour ton Elo."
          action="Retour au sujet"
          onAction={leave}
        />
      </View>
    );
  }

  if (offline && running) {
    return (
      <View
        style={[
          styles.offline,
          { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <View style={styles.offlineBody}>
          <WifiSlash size={40} color="#E5645A" />
          <SecondsLeft
            deadline={deadline}
            frozen={revealed}
            style={styles.offlineCount}
          />
          <AppText variant="callout" style={styles.muted}>
            secondes
          </AppText>
          <AppText variant="title1" weight="bold" style={styles.centered}>
            Connexion perdue
          </AppText>
          <AppText variant="callout" style={[styles.muted, styles.centered]}>
            Le duel reprend tout seul dès que le réseau revient. Sans retour à
            temps, la manche compte comme sans réponse.
          </AppText>
        </View>
        <JoBanner
          title={`${opponentName} t'attend`}
          message={
            currentRound
              ? `Manche ${roundNumber(currentRound.round)} sur 7`
              : undefined
          }
        />
        <AppButton
          label="Abandonner le duel"
          variant="destructiveSoft"
          size="lg"
          fullWidth
          onPress={() => setQuitOpen(true)}
        />
      </View>
    );
  }

  const topic = topicQuery.data?.topic;
  const topicLabel = topic ? topicName(topic.names, language) : "Duel";
  const rating = me.data?.progression.rating;
  const myTier = rating === undefined ? null : eloTier(rating);

  const introRound =
    nextRoundAt && introReached
      ? currentRound
        ? roundNumber(currentRound.round) + 1
        : 1
      : null;

  if (!currentRound && introRound === null) {
    return (
      <FaceOff
        topic={topicLabel}
        me={{
          name: myName,
          tier: myTier,
          avatarOptions: me.data?.avatarOptions,
          detail:
            myTier && rating !== undefined
              ? `${tierLabel(myTier)} · ${rating}`
              : undefined,
        }}
        opponent={{ name: opponentName }}
      />
    );
  }

  const myTone: ScoreTone =
    revealed && myAnswer ? (myAnswer.correct ? "correct" : "wrong") : "rest";
  const theirTone: ScoreTone =
    revealed && theirAnswer
      ? theirAnswer.correct
        ? "correct"
        : "wrong"
      : "rest";

  const answerState = (choice: GameChoice): AnswerState => {
    if (revealed) {
      if (choice === correctAnswer) return "correct";
      if (myAnswer?.choice === choice || theirAnswer?.choice === choice) {
        return "wrong";
      }
      return "unchosen";
    }
    if (selectedChoice === choice) return "pending";
    return selectedChoice ? "unchosen" : "rest";
  };

  const illustrated = Boolean(currentRound?.imageUrl);
  const roundKey = currentRound?.round ?? "intro";
  const myGain = myAnswer?.points ?? 0;
  const choices = CHOICES.filter((choice) => localized.answers[choice]);
  const cards = choices.map((choice, index) => (
    <AnswerCard
      key={`${roundKey}-${choice}`}
      index={index}
      label={localized.answers[choice]}
      state={answerState(choice)}
      mine={selectedChoice === choice}
      theirs={revealed && theirAnswer?.choice === choice}
      background={BG}
      compact={illustrated}
      onPress={() => {
        if (!isAnswerable || !currentRound) return;
        haptic("selection");
        setPendingRound(currentRound.round);
        setPendingChoice(choice);
        answer.mutate(choice);
      }}
    />
  ));

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <TimerBar
        deadline={deadline}
        running={answersOpen && !revealed}
        frozen={revealed}
        low={low}
      />

      <DuelScoreboard
        deadline={deadline}
        frozen={revealed}
        low={low}
        me={{
          name: myName,
          score: myScore,
          tone: myTone,
          tier: myTier,
          avatarOptions: me.data?.avatarOptions,
        }}
        opponent={{ name: opponentName, score: theirScore, tone: theirTone }}
      />

      <View style={[styles.stage, { paddingBottom: insets.bottom + 16 }]}>
        <Gauge score={myScore} tone={myTone} side="left" />
        <Gauge score={theirScore} tone={theirTone} side="right" />

        {introRound !== null ? (
          <RoundIntro
            round={introRound}
            topic={topicLabel}
            dots={roundDots(game, userId, introRound)}
          />
        ) : illustrated && currentRound?.imageUrl ? (
          <View style={styles.illustrated}>
            <AppText variant="title2" weight="semibold" style={styles.question}>
              {localized.questionText}
            </AppText>
            <Image
              source={{ uri: currentRound.imageUrl }}
              style={styles.image}
              contentFit="cover"
              transition={150}
            />
            <View style={styles.grid}>
              {answersOpen ? (
                <>
                  <View style={styles.gridRow}>{cards.slice(0, 2)}</View>
                  <View style={styles.gridRow}>{cards.slice(2)}</View>
                </>
              ) : null}
            </View>
          </View>
        ) : (
          <>
            <View style={styles.questionZone}>
              <Animated.View
                key={roundKey}
                style={{
                  animationName: questionIn,
                  animationDuration: 400,
                  animationTimingFunction: EASE,
                  animationFillMode: "both",
                }}
              >
                <AppText variant="title1" weight="semibold" style={styles.question}>
                  {localized.questionText}
                </AppText>
              </Animated.View>
              {!revealed && theirAnswer ? (
                <Animated.View
                  style={[
                    styles.opponentAnswered,
                    {
                      animationName: popIn,
                      animationDuration: 300,
                      animationTimingFunction: EASE_POP,
                      animationFillMode: "both",
                    },
                  ]}
                >
                  <Lightning size={14} color="#E8B04A" weight="fill" />
                  <AppText variant="caption" weight="semibold" style={styles.muted}>
                    {vsBot ? "Le bot" : opponentName} a répondu
                  </AppText>
                </Animated.View>
              ) : null}
              {revealed ? (
                <Animated.View
                  key={`gain-${roundKey}`}
                  style={[
                    styles.gain,
                    {
                      animationName: gainFloat,
                      animationDuration: 2200,
                      animationTimingFunction: EASE,
                      animationFillMode: "both",
                    },
                  ]}
                >
                  <AppText
                    variant="numeric"
                    weight="bold"
                    style={[
                      styles.gainText,
                      { color: myGain > 0 ? "#4FB286" : "#E5645A" },
                    ]}
                  >
                    {myGain > 0 ? `+${myGain}` : "0"}
                  </AppText>
                </Animated.View>
              ) : null}
            </View>
            <View style={styles.answers}>{answersOpen ? cards : null}</View>
          </>
        )}

      </View>

      {/* Zone discrète du prototype, en plus du retour Android. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abandonner"
        onPress={() => {
          haptic("warning");
          setQuitOpen(true);
        }}
        style={[styles.quitZone, { top: insets.top }]}
      />

      <JoSheet
        visible={quitOpen}
        onClose={() => setQuitOpen(false)}
        title="Abandonner le duel ?"
      >
        <View style={styles.sheet}>
          <AppText variant="body" tone="secondary">
            {vsBot
              ? "Cet entraînement s'arrête ici, sans effet sur ton Elo."
              : `${opponentName} gagne la partie. La défaite compte dans ton Elo.`}
          </AppText>
          <AppButton
            label="Abandonner"
            variant="destructive"
            size="lg"
            fullWidth
            onPress={() => {
              setQuitOpen(false);
              void gamesService
                .abandon(gameId)
                .catch(() => undefined)
                .finally(leave);
            }}
          />
          <AppButton
            label="Continuer le duel"
            variant="plain"
            fullWidth
            onPress={() => setQuitOpen(false)}
          />
        </View>
      </JoSheet>
    </View>
  );
}

export function DuelScreen() {
  return (
    <DarkTheme value>
      <StatusBar style="light" />
      <ArenaScreen />
    </DarkTheme>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  muted: { color: "#9B9B9B" },
  offline: { flex: 1, gap: 24, paddingHorizontal: 24, backgroundColor: BG },
  offlineBody: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  offlineCount: { fontSize: 96, lineHeight: 104, color: "#FFFFFF" },
  centered: { textAlign: "center" },
  stage: { flex: 1, minHeight: 0, paddingTop: 8, paddingHorizontal: 20 },
  gauge: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 7,
    justifyContent: "flex-end",
  },
  gaugeLeft: { left: 0 },
  gaugeRight: { right: 0 },
  questionZone: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  question: { textAlign: "center", color: "#FFFFFF" },
  answers: { minHeight: 316, justifyContent: "flex-end", gap: 12 },
  illustrated: { flex: 1, minHeight: 0, gap: 16 },
  image: { flex: 1, minHeight: 0, borderRadius: 12 },
  grid: { minHeight: 152, gap: 8 },
  gridRow: { flexDirection: "row", gap: 8 },
  opponentAnswered: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  gain: { position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center" },
  gainText: { fontSize: 36, lineHeight: 40 },
  quitZone: { position: "absolute", left: 0, width: 60, height: 50 },
  sheet: { gap: 12, paddingHorizontal: 16 },
});
