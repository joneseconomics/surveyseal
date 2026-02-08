import { z } from "zod";

export const cjItemContentSchema = z.object({
  text: z.string().optional(),
  imageUrl: z.string().url().optional(),
  description: z.string().optional(),
  fileUrl: z.string().url().optional(),
  fileType: z.string().optional(),
  fileName: z.string().optional(),
  filePath: z.string().optional(),
});

export type CJItemContent = z.infer<typeof cjItemContentSchema>;

export const addCJItemSchema = z.object({
  surveyId: z.string(),
  label: z.string().min(1, "Label is required").max(200),
  content: cjItemContentSchema,
});

export const updateCJItemSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required").max(200),
  content: cjItemContentSchema,
});

export const updateCJSettingsSchema = z.object({
  surveyId: z.string(),
  cjPrompt: z.string().min(1, "Prompt is required").max(2000),
  comparisonsPerJudge: z.coerce.number().int().min(1).max(1000).nullable(),
});
