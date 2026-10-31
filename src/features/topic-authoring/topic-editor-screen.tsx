import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useTopicOverview } from "@/features/topic/hooks/useTopicDetail";
import { haptic } from "@/lib/haptics";
import { topicName } from "@/shared/utils/topic-name";
import { JoButton } from "@/ui/jo/jo-button";
import { JoField } from "@/ui/jo/jo-field";
import { JoListRow } from "@/ui/jo/jo-list-row";
import { JoModalBar } from "@/ui/jo/jo-modal-bar";
import { JoProgressBar } from "@/ui/jo/jo-progress-bar";
import { JoSectionHeader } from "@/ui/jo/jo-section-header";
import { JoSheet } from "@/ui/jo/jo-sheet";
import { JoTopicCard } from "@/ui/jo/jo-topic-card";
import { Image as ImageIcon, Plus, SquaresFour } from "@/ui/phosphor";
import { AppText } from "@/ui/text";
import { categories, categoryLabel } from "@/ui/tokens";
import { useNativeTheme } from "@/ui/theme";
import {
  MAX_TOPIC_NAME,
  MIN_QUESTIONS,
  questionContent,
} from "./domain/topic-authoring";
import {
  useCreateTopic,
  useImagePick,
  usePublishTopic,
  useTopicQuestions,
  useUpdateTopic,
} from "./hooks/useTopicAuthoring";

const CATEGORY_CODES = Object.keys(categories);

/** Nouveau sujet ou brouillon : couleur et icône viennent de la catégorie. */
export function TopicEditorScreen() {
  const params = useLocalSearchParams<{ topicId?: string }>();
  const router = useRouter();
  const { colors } = useNativeTheme();
  const [topicId, setTopicId] = useState(params.topicId);
  const overview = useTopicOverview(topicId ?? "");
  const questions = useTopicQuestions(topicId);
  const create = useCreateTopic();
  const update = useUpdateTopic(topicId);
  const publish = usePublishTopic(topicId);
  const { pick, uploading } = useImagePick();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const topic = overview.data?.topic;

  useEffect(() => {
    if (!topic) return;
    setName(topicName(topic.names, "fr"));
    setCategory(topic.category ?? "GENERAL");
    setImageUrl(topic.imageUrl);
  }, [topic]);

  const list = questions.data?.content ?? [];
  const count = list.length;
  const published = topic?.status === "PUBLISHED";
  const trimmed = name.trim();

  /** Le brouillon existe dès la première question : celle-ci lui est rattachée. */
  const ensureTopic = async (): Promise<string | null> => {
    if (topicId) {
      if (trimmed !== (topic ? topicName(topic.names, "fr") : "")) {
        await update.mutateAsync({ name: trimmed });
      }
      return topicId;
    }
    const { id } = await create.mutateAsync({
      names: { fr: trimmed },
      category,
      imageUrl,
    });
    setTopicId(id);
    return id;
  };

  const openQuestion = async (questionId?: string) => {
    const id = await ensureTopic().catch(() => null);
    if (!id) return;
    router.push({
      pathname: "/(app)/question-editor",
      params: { topicId: id, questionId, number: count + 1 },
    });
  };

  const confirm = async () => {
    const id = await ensureTopic().catch(() => null);
    if (!id) return;
    if (published) {
      router.back();
      return;
    }
    await publish.mutateAsync();
    haptic("success");
    router.back();
  };

  const chooseImage = async () => {
    const url = await pick();
    if (!url) return;
    setImageUrl(url);
    if (topicId) update.mutate({ imageUrl: url });
  };

  const chooseCategory = (code: string) => {
    setCategory(code);
    setPicking(false);
    if (topicId) update.mutate({ category: code });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <JoModalBar
        title={topicId ? "Modifier le sujet" : "Nouveau sujet"}
        onCancel={() => router.back()}
        confirm={published ? "Enregistrer" : "Publier"}
        confirmDisabled={
          !trimmed || (!published && count < MIN_QUESTIONS) || publish.isPending
        }
        onConfirm={() => void confirm()}
      />
      <KeyboardAwareScrollView
        bottomOffset={24}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.preview}>
          <JoTopicCard
            size="S"
            width={180}
            language="fr"
            onPress={() => undefined}
            topic={{
              topicId: topicId ?? "new",
              names: { fr: trimmed || "Nom du sujet" },
              description: null,
              category,
              categoryLabel: null,
              emoji: null,
              color: null,
              imageUrl,
              bannerUrl: null,
              followersCount: 0,
              questionsCount: count,
              followed: false,
              status: "DRAFT",
            }}
          />
        </View>
        <JoField
          label="Nom"
          value={name}
          onChangeText={setName}
          onClear={() => setName("")}
          maxLength={MAX_TOPIC_NAME}
          counter={`${name.length} / ${MAX_TOPIC_NAME}`}
        />
        <View style={[styles.list, { backgroundColor: colors.surface }]}>
          <JoListRow
            label="Univers"
            icon={<SquaresFour size={20} color={colors.secondaryLabel} />}
            value={categoryLabel(category)}
            onPress={() => setPicking(true)}
          />
          <JoListRow
            label="Vignette"
            icon={<ImageIcon size={20} color={colors.secondaryLabel} />}
            value={
              uploading ? "Envoi…" : imageUrl ? "Remplacer" : "Ajouter"
            }
            last
            onPress={() => void chooseImage()}
          />
        </View>
        <View style={styles.section}>
          <JoSectionHeader
            title="Questions"
            count={`${count} / ${MIN_QUESTIONS} minimum`}
          />
          <JoProgressBar value={(count / MIN_QUESTIONS) * 100} />
          {count > 0 ? (
            <View style={[styles.list, { backgroundColor: colors.surface }]}>
              {list.map((question, index) => (
                <JoListRow
                  key={question.questionId}
                  label={questionContent(question)?.text ?? "Question"}
                  last={index === count - 1}
                  onPress={() => void openQuestion(question.questionId)}
                />
              ))}
            </View>
          ) : null}
          <JoButton
            label="Ajouter une question"
            variant="secondary"
            icon={<Plus size={20} color={colors.label} />}
            disabled={!trimmed}
            loading={create.isPending}
            onPress={() => void openQuestion()}
          />
        </View>
        {!published ? (
          <AppText variant="footnote" tone="secondary">
            Le sujet reste en brouillon tant qu&apos;il a moins de {MIN_QUESTIONS}{" "}
            questions.
          </AppText>
        ) : null}
      </KeyboardAwareScrollView>

      <JoSheet
        visible={picking}
        onClose={() => setPicking(false)}
        title="Univers"
      >
        <ScrollView style={styles.sheet}>
          <View style={[styles.sheetList, { backgroundColor: colors.raised }]}>
            {CATEGORY_CODES.map((code, index) => (
              <JoListRow
                key={code}
                label={categoryLabel(code)}
                control="radio"
                on={code === category}
                last={index === CATEGORY_CODES.length - 1}
                onPress={() => chooseCategory(code)}
              />
            ))}
          </View>
        </ScrollView>
      </JoSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { gap: 24, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 42 },
  preview: { alignItems: "center" },
  section: { gap: 12 },
  list: { borderRadius: 16, overflow: "hidden" },
  sheet: { maxHeight: 460 },
  sheetList: { marginHorizontal: 16, borderRadius: 12, overflow: "hidden" },
});
