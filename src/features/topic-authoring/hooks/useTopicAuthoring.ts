import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { queryKeys } from "@/lib/query-keys";
import {
  topicAuthoringService,
  uploadMedia,
} from "@/lib/services/topic-authoring";
import { showToast } from "@/lib/toast";
import {
  draftAnswers,
  type QuestionDraft,
  type QuestionEditor,
} from "../domain/topic-authoring";

const FAILURE = { title: "Action impossible, réessaie.", tone: "danger" } as const;

export function useTopicQuestions(topicId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.topics.questions(topicId ?? ""),
    queryFn: () => topicAuthoringService.questions(topicId ?? ""),
    enabled: !!topicId,
    staleTime: 0,
  });
}

function useRefreshTopic(topicId: string | undefined) {
  const queryClient = useQueryClient();
  return () => {
    if (topicId) {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.topics.questions(topicId),
      });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.topics.overview(topicId),
      });
    }
    void queryClient.invalidateQueries({ queryKey: queryKeys.topics.all });
  };
}

export function useCreateTopic() {
  const refresh = useRefreshTopic(undefined);
  return useMutation({
    mutationFn: topicAuthoringService.createTopic,
    onSuccess: refresh,
    onError: () => showToast(FAILURE),
  });
}

export function useUpdateTopic(topicId: string | undefined) {
  const refresh = useRefreshTopic(topicId);
  return useMutation({
    mutationFn: async (patch: {
      name?: string;
      category?: string;
      imageUrl?: string | null;
    }) => {
      if (!topicId) return;
      if (patch.name !== undefined) {
        await topicAuthoringService.updateName(topicId, patch.name);
      }
      if (patch.category !== undefined) {
        await topicAuthoringService.updateCategory(topicId, patch.category);
      }
      if (patch.imageUrl !== undefined) {
        await topicAuthoringService.updateImageUrl(topicId, patch.imageUrl);
      }
    },
    onSuccess: refresh,
    onError: () => showToast(FAILURE),
  });
}

export function usePublishTopic(topicId: string | undefined) {
  const refresh = useRefreshTopic(topicId);
  return useMutation({
    mutationFn: () => topicAuthoringService.publish(topicId ?? ""),
    onSuccess: () => {
      refresh();
      showToast({ title: "Sujet publié", tone: "success" });
    },
    onError: () => showToast(FAILURE),
  });
}

export function useSaveQuestion(topicId: string | undefined) {
  const refresh = useRefreshTopic(topicId);
  return useMutation({
    mutationFn: async ({
      question,
      draft,
    }: {
      question: QuestionEditor | null;
      draft: QuestionDraft;
    }) => {
      const answers = draftAnswers(draft);
      const text = draft.text.trim();
      if (!question) {
        await topicAuthoringService.createQuestion(topicId ?? "", {
          contents: [{ language: "fr", text, answers }],
          correctAnswer: draft.correctAnswer,
          imageUrl: draft.imageUrl,
        });
        return;
      }
      await topicAuthoringService.updateText(question.questionId, text);
      await topicAuthoringService.updateAnswers(question.questionId, answers);
      if (draft.correctAnswer !== question.correctAnswer) {
        await topicAuthoringService.updateCorrectAnswer(
          question.questionId,
          draft.correctAnswer,
        );
      }
      if (draft.imageUrl !== question.imageUrl) {
        await topicAuthoringService.updateQuestionImageUrl(
          question.questionId,
          draft.imageUrl,
        );
      }
    },
    onSuccess: refresh,
    onError: () => showToast(FAILURE),
  });
}

export function useModerateQuestion(topicId: string | undefined) {
  const refresh = useRefreshTopic(topicId);
  const approve = useMutation({
    mutationFn: topicAuthoringService.approve,
    onSuccess: refresh,
    onError: () => showToast(FAILURE),
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string | null }) =>
      topicAuthoringService.reject(id, reason),
    onSuccess: refresh,
    onError: () => showToast(FAILURE),
  });
  const resolve = useMutation({
    mutationFn: ({
      id,
      resolution,
    }: {
      id: string;
      resolution: "RESOLVED" | "DISMISSED";
    }) => topicAuthoringService.resolveReports(id, resolution),
    onSuccess: refresh,
    onError: () => showToast(FAILURE),
  });
  return { approve, reject, resolve };
}

/** Sélection puis envoi d'une image : `POST /api/media`, JPG ou PNG de 5 Mo au plus. */
export function useImagePick() {
  const [uploading, setUploading] = useState(false);
  const pick = async (): Promise<string | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return null;
    setUploading(true);
    try {
      return await uploadMedia(asset);
    } catch {
      showToast({
        title: "Image refusée",
        description: "JPG ou PNG, 5 Mo maximum.",
        tone: "danger",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };
  return { pick, uploading };
}
