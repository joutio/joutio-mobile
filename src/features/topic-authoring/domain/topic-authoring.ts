import type { Page } from "@/shared/types/bff";

export type QuestionChoice = "A" | "B" | "C" | "D";
export type QuestionStatus = "PENDING" | "APPROVED" | "REJECTED";

export const QUESTION_CHOICES: QuestionChoice[] = ["A", "B", "C", "D"];
export const MIN_QUESTIONS = 7;
export const MAX_TOPIC_NAME = 25;
export const MAX_QUESTION_TEXT = 120;

export interface QuestionAnswer {
  choice: QuestionChoice;
  text: string;
}

export interface QuestionContent {
  language: string;
  text: string;
  answers: QuestionAnswer[];
}

/** Question vue par son auteur (`QuestionEditorView`). */
export interface QuestionEditor {
  questionId: string;
  contents: QuestionContent[];
  correctAnswer: QuestionChoice;
  imageUrl: string | null;
  status: QuestionStatus;
  suspended: boolean;
  archived: boolean;
  openReportCount: number;
  createdAt: string;
}

export type QuestionPage = Page<QuestionEditor>;

export interface OwnerQuestionReport {
  reportId: string;
  reasons: string[];
  comment: string | null;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
  createdAt: string;
}

export interface QuestionDraft {
  text: string;
  answers: Record<QuestionChoice, string>;
  correctAnswer: QuestionChoice;
  imageUrl: string | null;
}

export function emptyQuestionDraft(): QuestionDraft {
  return {
    text: "",
    answers: { A: "", B: "", C: "", D: "" },
    correctAnswer: "A",
    imageUrl: null,
  };
}

export function questionContent(question: QuestionEditor): QuestionContent | null {
  return (
    question.contents.find((content) => content.language === "fr") ??
    question.contents[0] ??
    null
  );
}

export function draftFromQuestion(question: QuestionEditor): QuestionDraft {
  const draft = emptyQuestionDraft();
  const content = questionContent(question);
  draft.text = content?.text ?? "";
  content?.answers.forEach((answer) => {
    draft.answers[answer.choice] = answer.text;
  });
  draft.correctAnswer = question.correctAnswer;
  draft.imageUrl = question.imageUrl;
  return draft;
}

/** Quatre réponses obligatoires, distinctes et une question renseignée. */
export function isQuestionValid(draft: QuestionDraft): boolean {
  const answers = QUESTION_CHOICES.map((choice) =>
    draft.answers[choice].trim().toLowerCase(),
  );
  return (
    draft.text.trim().length > 0 &&
    answers.every(Boolean) &&
    new Set(answers).size === QUESTION_CHOICES.length
  );
}

export function draftAnswers(draft: QuestionDraft): QuestionAnswer[] {
  return QUESTION_CHOICES.map((choice) => ({
    choice,
    text: draft.answers[choice].trim(),
  }));
}
