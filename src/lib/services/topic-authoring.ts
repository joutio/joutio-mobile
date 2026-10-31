import { api } from "@/lib/api";
import { ENDPOINTS } from "@/lib/endpoints";
import type {
  OwnerQuestionReport,
  QuestionAnswer,
  QuestionChoice,
  QuestionPage,
} from "@/features/topic-authoring/domain/topic-authoring";

interface CreateTopicInput {
  names: { fr: string };
  category: string;
  imageUrl?: string | null;
}

interface CreateQuestionInput {
  contents: { language: string; text: string; answers: QuestionAnswer[] }[];
  correctAnswer: QuestionChoice;
  imageUrl?: string | null;
}

/** Écritures d'auteur : réservées au créateur du sujet côté BFF. */
export const topicAuthoringService = {
  createTopic: (input: CreateTopicInput) =>
    api.post<{ id: string }>(ENDPOINTS.topics.create, input),
  updateName: (topicId: string, name: string) =>
    api.put<void>(ENDPOINTS.topics.name(topicId), { language: "fr", name }),
  updateCategory: (topicId: string, category: string) =>
    api.put<void>(ENDPOINTS.topics.category(topicId), { category }),
  updateImageUrl: (topicId: string, imageUrl: string | null) =>
    api.put<void>(ENDPOINTS.topics.imageUrl(topicId), { imageUrl }),
  publish: (topicId: string) =>
    api.post<void>(ENDPOINTS.topics.publish(topicId)),
  questions: (topicId: string) =>
    api.get<QuestionPage>(ENDPOINTS.topics.questions(topicId), {
      params: { page: 0, size: 100 },
    }),
  createQuestion: (topicId: string, input: CreateQuestionInput) =>
    api.post<{ id: string }>(ENDPOINTS.topics.questions(topicId), input),
  updateText: (questionId: string, text: string) =>
    api.put<void>(ENDPOINTS.questions.text(questionId), {
      language: "fr",
      text,
    }),
  updateAnswers: (questionId: string, answers: QuestionAnswer[]) =>
    api.put<void>(ENDPOINTS.questions.answers(questionId), {
      language: "fr",
      answers,
    }),
  updateCorrectAnswer: (questionId: string, correctAnswer: QuestionChoice) =>
    api.put<void>(ENDPOINTS.questions.correctAnswer(questionId), {
      correctAnswer,
    }),
  updateQuestionImageUrl: (questionId: string, imageUrl: string | null) =>
    api.put<void>(ENDPOINTS.questions.imageUrl(questionId), { imageUrl }),
  approve: (questionId: string) =>
    api.post<void>(ENDPOINTS.questions.approve(questionId)),
  reject: (questionId: string, reason: string | null) =>
    api.post<void>(ENDPOINTS.questions.reject(questionId), { reason }),
  reports: (questionId: string) =>
    api.get<OwnerQuestionReport[]>(ENDPOINTS.questions.reports(questionId)),
  resolveReports: (
    questionId: string,
    resolution: "RESOLVED" | "DISMISSED",
  ) =>
    api.post<{ resolvedCount: number }>(
      ENDPOINTS.questions.resolveAll(questionId),
      { resolution },
    ),
};

/** Téléverse une image choisie sur l'appareil : le BFF la normalise et renvoie son URL. */
export async function uploadMedia(asset: {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
}): Promise<string> {
  const form = new FormData();
  form.append("file", {
    uri: asset.uri,
    name: asset.fileName ?? "image.jpg",
    type: asset.mimeType ?? "image/jpeg",
  } as unknown as Blob);
  const media = await api.post<{ url: string }>(ENDPOINTS.media.upload, form);
  return media.url;
}
