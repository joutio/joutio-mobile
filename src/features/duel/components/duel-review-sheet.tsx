import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import { showToast } from "@/lib/toast";
import type { Language } from "@/shared/types/bff";
import { JoChip } from "@/ui/jo/jo-chip";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import {
  localizedQuestion,
  roundNumber,
  type GameState,
} from "../domain/game";

const REASONS = [
  { value: "QUESTION", label: "Énoncé" },
  { value: "IMAGE", label: "Image" },
  { value: "ANSWERS", label: "Réponses" },
];

interface DuelReviewSheetProps {
  visible: boolean;
  onClose: () => void;
  game: GameState;
  meId: string | null;
  opponentId: string | null;
  language: Language;
}

/** Revue du duel : une case par manche, détail et signalement de question. */
export function DuelReviewSheet({
  visible,
  onClose,
  game,
  meId,
  opponentId,
  language,
}: DuelReviewSheetProps) {
  const { colors } = useNativeTheme();
  const rounds = Object.values(game.rounds).sort(
    (a, b) => roundNumber(a.round) - roundNumber(b.round),
  );
  const [index, setIndex] = useState(0);
  const [reporting, setReporting] = useState(false);
  const round = rounds[index] ?? null;
  const question = localizedQuestion(round, language);
  const mine = meId ? round?.playerAnswers[meId] : undefined;
  const theirs = opponentId ? round?.playerAnswers[opponentId] : undefined;

  const report = useMutation({
    mutationFn: (reason: string) =>
      api.post<unknown>(ENDPOINTS.questionReports(round?.questionId ?? ""), {
        gameId: game.gameId,
        reasons: [reason],
        language,
      }),
    onSuccess: () => {
      setReporting(false);
      showToast({ title: "Question signalée", tone: "success" });
    },
    onError: () =>
      showToast({ title: "Signalement impossible, réessaie.", tone: "danger" }),
  });

  const square = (correct: boolean | undefined) => ({
    backgroundColor:
      correct === undefined
        ? colors.hover
        : correct
          ? colors.success
          : colors.danger,
  });

  return (
    <JoSheet
      visible={visible}
      onClose={onClose}
      title="Détails du duel"
      action={round?.questionId ? "Signaler" : undefined}
      onAction={() => setReporting((value) => !value)}
    >
      <ScrollView nestedScrollEnabled style={styles.scroll}>
        <View style={styles.body}>
          <View style={styles.grid}>
            {rounds.map((item, position) => {
              const me = meId ? item.playerAnswers[meId] : undefined;
              const them = opponentId ? item.playerAnswers[opponentId] : undefined;
              return (
                <Pressable
                  key={item.round}
                  accessibilityRole="button"
                  accessibilityLabel={`Question ${position + 1}`}
                  accessibilityState={{ selected: position === index }}
                  onPress={() => setIndex(position)}
                  style={[
                    styles.cell,
                    {
                      borderColor:
                        position === index ? colors.accent : colors.border,
                    },
                  ]}
                >
                  <AppText variant="caption" weight="semibold" tone="secondary">
                    Q{position + 1}
                  </AppText>
                  <View style={styles.squares}>
                    <View style={[styles.square, square(me?.correct)]} />
                    <View style={[styles.square, square(them?.correct)]} />
                  </View>
                  <AppText variant="numeric" weight="semibold" style={styles.points}>
                    {me?.points ?? 0}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {reporting ? (
            <View style={styles.reasons}>
              {REASONS.map((reason) => (
                <JoChip
                  key={reason.value}
                  label={reason.label}
                  onPress={() => report.mutate(reason.value)}
                />
              ))}
            </View>
          ) : null}

          {round ? (
            <>
              <AppText variant="headline" weight="semibold">
                {question.questionText}
              </AppText>
              <View style={styles.answers}>
                {Object.entries(question.answers).map(([choice, label]) => {
                  const correct = choice === round.correctAnswer;
                  const wrong =
                    !correct && (mine?.choice === choice || theirs?.choice === choice);
                  return (
                    <View
                      key={choice}
                      style={[
                        styles.answer,
                        {
                          backgroundColor: correct
                            ? colors.success
                            : wrong
                              ? colors.danger
                              : colors.raised,
                        },
                      ]}
                    >
                      <AppText
                        variant="callout"
                        weight="semibold"
                        style={{
                          color: correct || wrong ? "#000000" : colors.label,
                        }}
                      >
                        {label}
                      </AppText>
                      {mine?.choice === choice ? (
                        <AppText variant="caption" style={styles.tag}>
                          Toi
                        </AppText>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <AppText variant="callout" tone="secondary">
              Le détail de ce duel n'est plus disponible.
            </AppText>
          )}
        </View>
      </ScrollView>
    </JoSheet>
  );
}

const styles = StyleSheet.create({
  scroll: { maxHeight: 560 },
  body: { gap: 16, paddingHorizontal: 16 },
  grid: { flexDirection: "row", gap: 4 },
  cell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  squares: { flexDirection: "row", gap: 4 },
  square: { width: 8, height: 8, borderRadius: 2 },
  points: { fontSize: 12, lineHeight: 16 },
  reasons: { flexDirection: "row", gap: 8 },
  answers: { gap: 8 },
  answer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  tag: { color: "#000000" },
});
