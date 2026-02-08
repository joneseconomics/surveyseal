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

export const updateSurveySettingsSchema = z.object({
  id: z.string(),
  verificationPointTimerSeconds: z.coerce.number().int().min(10).max(300),
  requireLogin: z.coerce.boolean().default(true),
  tapinApiKey: z.string().optional(),
  tapinCampaignId: z.string().optional(),
});

export const updateCanvasSettingsSchema = z.object({
  surveyId: z.string(),
  canvasBaseUrl: z.string().url("Must be a valid URL").min(1),
  canvasApiToken: z.string().min(1, "API token is required"),
});

// ─── Question content schemas (discriminated by type) ──────────────────────

const textOnlyContent = z.object({
  text: z.string().min(1, "Question text is required"),
});

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

const checkboxContent = z.object({
  text: z.string().min(1, "Question text is required"),
  options: z.array(z.string().min(1)).min(2, "At least 2 options required").optional(),
});

const ratingContent = z.object({
  text: z.string().min(1, "Question text is required"),
  maxStars: z.number().int().min(1).max(10).optional(),
});

const sliderContent = z.object({
  text: z.string().min(1, "Question text is required"),
  min: z.number(),
  max: z.number(),
  step: z.number().optional(),
});

export const questionContentSchemas = {
  MULTIPLE_CHOICE: multipleChoiceContent,
  LIKERT: likertContent,
  FREE_TEXT: freeTextContent,
  MATRIX: matrixContent,
  RANKING: rankingContent,
  SHORT_TEXT: textOnlyContent,
  URL: textOnlyContent,
  EMAIL: textOnlyContent,
  YES_NO: textOnlyContent,
  CUSTOMER_SATISFACTION: textOnlyContent,
  NPS: textOnlyContent,
  CHECKBOX: checkboxContent,
  RATING: ratingContent,
  DATE: textOnlyContent,
  DATE_TIME: textOnlyContent,
  NUMBER: textOnlyContent,
  PERCENTAGE: textOnlyContent,
  SLIDER: sliderContent,
  PHONE_NUMBER: textOnlyContent,
} as const;

export const questionTypes = [
  "MULTIPLE_CHOICE",
  "LIKERT",
  "FREE_TEXT",
  "MATRIX",
  "RANKING",
  "SHORT_TEXT",
  "URL",
  "EMAIL",
  "YES_NO",
  "CUSTOMER_SATISFACTION",
  "NPS",
  "CHECKBOX",
  "RATING",
  "DATE",
  "DATE_TIME",
  "NUMBER",
  "PERCENTAGE",
  "SLIDER",
  "PHONE_NUMBER",
] as const;

export type QuestionTypeValue = (typeof questionTypes)[number];

export const addQuestionSchema = z.object({
  surveyId: z.string(),
  type: z.enum(questionTypes),
  content: z.record(z.string(), z.unknown()),
  isVerificationPoint: z.boolean().optional(),
});

export const updateQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(questionTypes),
  content: z.record(z.string(), z.unknown()),
  isVerificationPoint: z.boolean().optional(),
});
