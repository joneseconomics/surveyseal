import { z } from "zod";

export const surveyTypes = ["QUESTIONNAIRE", "COMPARATIVE_JUDGMENT"] as const;
export type SurveyTypeValue = (typeof surveyTypes)[number];

export const createSurveySchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(surveyTypes).default("QUESTIONNAIRE"),
});

export const updateSurveySchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
});

// ─── Question content schemas (discriminated by type) ──────────────────────

const multipleChoiceContent = z.object({
  text: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1)).min(2, "At least 2 options required").optional(),
});

const likertContent = z.object({
  text: z.string().min(1, "Question text is required"),
  scale: z.object({
    min: z.number().int(),
    max: z.number().int(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional(),
  }),
});

const freeTextContent = z.object({
  text: z.string().min(1, "Question text is required"),
});

const matrixContent = z.object({
  text: z.string().min(1, "Question text is required"),
  rows: z.array(z.string().min(1)).min(1, "At least 1 row required"),
  columns: z.array(z.string().min(1)).min(2, "At least 2 columns required"),
});

const rankingContent = z.object({
  text: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1)).min(2, "At least 2 options required"),
});

export const questionContentSchemas = {
  MULTIPLE_CHOICE: multipleChoiceContent,
  LIKERT: likertContent,
  FREE_TEXT: freeTextContent,
  MATRIX: matrixContent,
  RANKING: rankingContent,
} as const;

export const questionTypes = [
  "MULTIPLE_CHOICE",
  "LIKERT",
  "FREE_TEXT",
  "MATRIX",
  "RANKING",
] as const;

export type QuestionTypeValue = (typeof questionTypes)[number];

export const addQuestionSchema = z.object({
  surveyId: z.string(),
  type: z.enum(questionTypes),
  content: z.record(z.string(), z.unknown()),
  isCheckpoint: z.boolean().optional(),
});

export const updateQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(questionTypes),
  content: z.record(z.string(), z.unknown()),
  isCheckpoint: z.boolean().optional(),
});
