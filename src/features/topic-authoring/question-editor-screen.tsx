import { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { haptic } from "@/lib/haptics";
import { JoField } from "@/ui/jo/jo-field";
import { JoModalBar } from "@/ui/jo/jo-modal-bar";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { Circle, RadioButton } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { useNativeTheme } from "@/ui/theme";
import {
  draftFromQuestion,
  emptyQuestionDraft,
  isQuestionValid,
  MAX_QUESTION_TEXT,
  QUESTION_CHOICES,
} from "./domain/topic-authoring";
import {
  useImagePick,
  useSaveQuestion,
  useTopicQuestions,
} from "./hooks/useTopicAuthoring";

/** Une question, quatre réponses et une seule juste. */
export function QuestionEditorScreen() {
  const { topicId, questionId, number } = useLocalSearchParams<{
    topicId: string;
    questionId?: string;
    number?: string;
  }>();
  const router = useRouter();
  const { colors } = useNativeTheme();
  const questions = useTopicQuestions(topicId);
  const save = useSaveQuestion(topicId);
  const { pick, uploading } = useImagePick();
  const [draft, setDraft] = useState(emptyQuestionDraft);
  const question =
    questions.data?.content.find((item) => item.questionId === questionId) ??
    null;

  useEffect(() => {
    if (question) setDraft(draftFromQuestion(question));
  }, [question]);

  const submit = () =>
    save.mutate(
      { question, draft },
      { onSuccess: () => router.back() },
    );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <JoModalBar
        title={question ? "Question" : `Question ${number ?? ""}`.trim()}
        onCancel={() => router.back()}
        confirm="Enregistrer"
        confirmDisabled={!isQuestionValid(draft) || save.isPending}
        onConfirm={submit}
      />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ajouter une image"
          onPress={() =>
            void pick().then((url) => {
              if (url) setDraft((value) => ({ ...value, imageUrl: url }));
            })
          }
          style={[styles.image, { backgroundColor: colors.surface }]}
        >
          {draft.imageUrl ? (
            <Image
              source={{ uri: draft.imageUrl }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <AppText variant="numeric" tone="secondary" style={styles.imageText}>
              {uploading
                ? "envoi…"
                : "ajouter une image · facultatif · JPG ou PNG, 5 Mo"}
            </AppText>
          )}
        </Pressable>
        <JoField
          label="Question"
          value={draft.text}
          multiline
          maxLength={MAX_QUESTION_TEXT}
          counter={`${draft.text.length} / ${MAX_QUESTION_TEXT}`}
          onChangeText={(text) => setDraft((value) => ({ ...value, text }))}
        />
        <View style={styles.section}>
          <JoSectionHeader title="Réponses" />
          <AppText variant="footnote" tone="secondary" style={styles.hint}>
            Touche le rond de la bonne réponse.
          </AppText>
          <View style={[styles.list, { backgroundColor: colors.surface }]}>
            {QUESTION_CHOICES.map((choice, index) => {
              const on = draft.correctAnswer === choice;
              return (
                <View
                  key={choice}
                  style={[
                    styles.answer,
                    {
                      borderBottomWidth: index === 3 ? 0 : 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    value={draft.answers[choice]}
                    placeholder={`Réponse ${index + 1}`}
                    placeholderTextColor={colors.secondaryLabel}
                    selectionColor={colors.accent}
                    maxLength={MAX_QUESTION_TEXT}
                    accessibilityLabel={`Réponse ${index + 1}`}
                    onChangeText={(text) =>
                      setDraft((value) => ({
                        ...value,
                        answers: { ...value.answers, [choice]: text },
                      }))
                    }
                    style={[styles.input, { color: colors.label }]}
                  />
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`Réponse ${index + 1} juste`}
                    accessibilityState={{ checked: on }}
                    hitSlop={10}
                    onPress={() => {
                      haptic("selection");
                      setDraft((value) => ({ ...value, correctAnswer: choice }));
                    }}
                  >
                    {on ? (
                      <RadioButton size={24} color={colors.accent} weight="fill" />
                    ) : (
                      <Circle size={24} color={colors.secondaryLabel} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 16, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 42 },
  image: {
    height: 96,
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  imageText: { fontSize: 12, lineHeight: 16, fontWeight: "400", textAlign: "center" },
  section: { gap: 12 },
  hint: { marginTop: -8 },
  list: { borderRadius: 16, overflow: "hidden" },
  answer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    fontFamily: "Geist_400Regular",
    fontSize: 16,
  },
});
