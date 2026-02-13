import type { QuestionType } from "@/generated/prisma/client";
import type { LLMMessage } from "./llm-client";

interface QuestionContent {
  text?: string;
  options?: string[];
  scale?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  rows?: string[];
  columns?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export function buildQuestionPrompt(
  personaSystemPrompt: string,
  surveyTitle: string,
  questionType: QuestionType,
  content: QuestionContent,
  retryFeedback?: string,
): LLMMessage[] {
  const systemPrompt = `${personaSystemPrompt}

You are completing a survey titled "${surveyTitle}". Answer each question in character. You MUST respond with ONLY valid JSON in the exact format specified — no markdown, no explanation, no extra text.`;

  const questionInstruction = buildQuestionInstruction(questionType, content);

  const userMsg = retryFeedback
    ? `${questionInstruction}\n\nYour previous answer was invalid: ${retryFeedback}. Please try again with the correct format.`
    : questionInstruction;

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ];
}

function buildQuestionInstruction(
  type: QuestionType,
  content: QuestionContent,
): string {
  const q = content.text ?? "Answer this question";

  switch (type) {
    case "MULTIPLE_CHOICE":
      return `Question: ${q}\nOptions: ${(content.options ?? []).join(", ")}\n\nPick exactly one option. Respond: {"answer": "<one of the options above>"}`;

    case "CHECKBOX":
      return `Question: ${q}\nOptions: ${(content.options ?? []).join(", ")}\n\nSelect one or more options. Respond: {"answer": ["option1", "option2"]}`;

    case "LIKERT": {
      const s = content.scale ?? { min: 1, max: 5 };
      const labels = s.minLabel && s.maxLabel ? ` (${s.min}=${s.minLabel}, ${s.max}=${s.maxLabel})` : "";
      return `Question: ${q}\nScale: ${s.min} to ${s.max}${labels}\n\nPick a whole number on the scale. Respond: {"answer": <number>}`;
    }

    case "RATING": {
      const s = content.scale ?? { min: 1, max: 5 };
      return `Question: ${q}\nRating: ${s.min} to ${s.max}\n\nPick a whole number. Respond: {"answer": <number>}`;
    }

    case "NPS":
      return `Question: ${q}\nScale: 0 to 10 (0=Not at all likely, 10=Extremely likely)\n\nPick a whole number 0-10. Respond: {"answer": <number>}`;

    case "SLIDER": {
      const min = content.min ?? content.scale?.min ?? 0;
      const max = content.max ?? content.scale?.max ?? 100;
      const step = content.step ?? 1;
      return `Question: ${q}\nSlider: ${min} to ${max} (step ${step})\n\nPick a number in range. Respond: {"answer": <number>}`;
    }

    case "CUSTOMER_SATISFACTION":
      return `Question: ${q}\nScale: 1 to 5 (1=Very Dissatisfied, 5=Very Satisfied)\n\nPick a whole number 1-5. Respond: {"answer": <number>}`;

    case "NUMBER": {
      const min = content.min ?? 0;
      const max = content.max ?? 999999;
      return `Question: ${q}\nRange: ${min} to ${max}\n\nProvide a number. Respond: {"answer": <number>}`;
    }

    case "PERCENTAGE":
      return `Question: ${q}\nPercentage: 0 to 100\n\nProvide a percentage. Respond: {"answer": <number>}`;

    case "MATRIX":
      return `Question: ${q}\nRows: ${(content.rows ?? []).join(", ")}\nColumns: ${(content.columns ?? []).join(", ")}\n\nFor each row, pick one column. Respond: {"answer": {"Row1": "Column1", "Row2": "Column2", ...}}`;

    case "RANKING":
      return `Question: ${q}\nItems to rank: ${(content.options ?? []).join(", ")}\n\nRank ALL items from most to least preferred. Respond: {"answer": ["best", "second", ..., "worst"]}`;

    case "FREE_TEXT":
      return `Question: ${q}\n\nWrite a 1-3 sentence response. Respond: {"answer": "<your text>"}`;

    case "SHORT_TEXT":
      return `Question: ${q}\n\nWrite a brief response (a few words to one sentence). Respond: {"answer": "<your text>"}`;

    case "YES_NO":
      return `Question: ${q}\n\nAnswer yes or no. Respond: {"answer": "yes"} or {"answer": "no"}`;

    case "DATE":
      return `Question: ${q}\n\nProvide a date in YYYY-MM-DD format. Respond: {"answer": "YYYY-MM-DD"}`;

    case "DATE_TIME":
      return `Question: ${q}\n\nProvide a date and time in ISO format. Respond: {"answer": "YYYY-MM-DDTHH:MM:SS"}`;

    case "EMAIL":
      return `Question: ${q}\n\nProvide a plausible email address. Respond: {"answer": "user@example.com"}`;

    case "URL":
      return `Question: ${q}\n\nProvide a plausible URL. Respond: {"answer": "https://example.com"}`;

    case "PHONE_NUMBER":
      return `Question: ${q}\n\nProvide a plausible phone number. Respond: {"answer": "+1-555-123-4567"}`;

    default:
      return `Question: ${q}\n\nRespond: {"answer": "<your response>"}`;
  }
}
