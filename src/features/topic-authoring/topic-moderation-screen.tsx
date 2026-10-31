import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { JoButton } from "@/ui/jo/jo-button";
import { JoEmptyState } from "@/ui/jo/jo-empty-state";
import { JoField } from "@/ui/jo/jo-field";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoLoading } from "@/ui/jo/jo-loading";
import { JoSegmented } from "@/ui/jo/jo-segmented";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { Flag, Question } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import { questionContent, type QuestionEditor } from "./domain/topic-authoring";
import {
  useModerateQuestion,
  useTopicQuestions,
} from "./hooks/useTopicAuthoring";

type Tab = "pending" | "reports";

/** File du créateur : questions à valider et signalements ouverts. */
export function TopicModerationScreen() {
  const { topicId } = useLocalSearchParams<{ topicId: string }>();
  const router = useRouter();
  const { colors } = useNativeTheme();
  const questions = useTopicQuestions(topicId);
  const { approve, reject, resolve } = useModerateQuestion(topicId);
  const [tab, setTab] = useState<Tab>("pending");
  const [rejecting, setRejecting] = useState<QuestionEditor | null>(null);
  const [reason, setReason] = useState("");

  const all = questions.data?.content ?? [];
  const pending = all.filter((question) => question.status === "PENDING");
  const reported = all.filter((question) => question.openReportCount > 0);
  const list = tab === "pending" ? pending : reported;

  const edit = (question: QuestionEditor) =>
    router.push({
      pathname: "/(app)/question-editor",
      params: { topicId, questionId: question.questionId },
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={styles.content}>
        <JoSegmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "pending", label: `À valider · ${pending.length}` },
            { value: "reports", label: `Signalements · ${reported.length}` },
          ]}
        />
        {questions.isPending ? <JoLoading /> : null}
        {!questions.isPending && list.length === 0 ? (
          <JoEmptyState
            icon={
              tab === "pending" ? (
                <Question size={36} color={colors.accent} weight="fill" />
              ) : (
                <Flag size={36} color={colors.accent} weight="fill" />
              )
            }
            title="Rien à traiter"
            message={
              tab === "pending"
                ? "Les questions à valider apparaîtront ici."
                : "Aucun signalement ouvert sur ce sujet."
            }
          />
        ) : null}
        {list.map((question) => {
          const content = questionContent(question);
          return (
            <View
              key={question.questionId}
              style={[styles.card, { backgroundColor: colors.surface }]}
            >
              {tab === "reports" ? (
                <AppText variant="footnote" tone="secondary">
                  {question.openReportCount} signalement
                  {question.openReportCount > 1 ? "s" : ""} ouvert
                  {question.openReportCount > 1 ? "s" : ""}
                </AppText>
              ) : null}
              <AppText variant="headline">{content?.text}</AppText>
              <View style={[styles.answers, { backgroundColor: colors.raised }]}>
                {content?.answers.map((answer, index) => {
                  const correct = answer.choice === question.correctAnswer;
                  return (
                    <JoListRow
                      key={answer.choice}
                      label={answer.text}
                      control={correct ? "check" : "none"}
                      on={correct}
                      strong={correct}
                      last={index === content.answers.length - 1}
                    />
                  );
                })}
              </View>
              <View style={styles.actions}>
                {tab === "pending" ? (
                  <>
                    <JoButton
                      label="Rejeter"
                      variant="destructiveSoft"
                      size="M"
                      style={styles.action}
                      onPress={() => {
                        setReason("");
                        setRejecting(question);
                      }}
                    />
                    <JoButton
                      label="Approuver"
                      size="M"
                      style={styles.action}
                      loading={approve.isPending}
                      onPress={() => approve.mutate(question.questionId)}
                    />
                  </>
                ) : (
                  <>
                    <JoButton
                      label="Écarter"
                      variant="secondary"
                      size="M"
                      style={styles.action}
                      onPress={() =>
                        resolve.mutate({
                          id: question.questionId,
                          resolution: "DISMISSED",
                        })
                      }
                    />
                    <JoButton
                      label="Résolu"
                      size="M"
                      style={styles.action}
                      onPress={() =>
                        resolve.mutate({
                          id: question.questionId,
                          resolution: "RESOLVED",
                        })
                      }
                    />
                  </>
                )}
              </View>
              <JoButton
                label="Modifier la question"
                variant="plain"
                size="M"
                onPress={() => edit(question)}
              />
            </View>
          );
        })}
      </ScrollView>

      <JoSheet
        visible={rejecting !== null}
        onClose={() => setRejecting(null)}
        title="Rejeter la question"
      >
        <View style={styles.sheet}>
          <JoField
            label="Motif"
            value={reason}
            onChangeText={setReason}
            multiline
            help="Facultatif"
          />
          <JoButton
            label="Rejeter"
            variant="destructive"
            loading={reject.isPending}
            onPress={() => {
              if (!rejecting) return;
              reject.mutate(
                { id: rejecting.questionId, reason: reason.trim() || null },
                { onSuccess: () => setRejecting(null) },
              );
            }}
          />
        </View>
      </JoSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16, paddingTop: 8, paddingHorizontal: 16, paddingBottom: 32 },
  card: { gap: 12, padding: 16, borderRadius: 16 },
  answers: { borderRadius: 16, overflow: "hidden" },
  actions: { flexDirection: "row", gap: 8 },
  action: { flex: 1, width: undefined },
  sheet: { gap: 12, paddingHorizontal: 16 },
});
