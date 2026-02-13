import type { QuestionType } from "@/generated/prisma/client";

interface QuestionContent {
  text?: string;
  options?: string[];
  scale?: { min: number; max: number };
  rows?: string[];
  columns?: string[];
  min?: number;
  max?: number;
}

export interface ValidationResult {
  valid: boolean;
  parsed: unknown;
  error?: string;
}

export function parseAndValidate(
  raw: string,
  questionType: QuestionType,
  content: QuestionContent,
): ValidationResult {
  // Extract JSON from the response (handle markdown code fences)
  const jsonStr = extractJSON(raw);
  if (!jsonStr) {
    return { valid: false, parsed: null, error: "Response is not valid JSON" };
  }

  let parsed: { answer: unknown };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return { valid: false, parsed: null, error: "Failed to parse JSON" };
  }

  if (!("answer" in parsed)) {
    return { valid: false, parsed: null, error: 'Missing "answer" field in JSON' };
  }

  const answer = parsed.answer;

  switch (questionType) {
    case "MULTIPLE_CHOICE": {
      if (typeof answer !== "string") {
        return { valid: false, parsed: answer, error: "Answer must be a string" };
      }
      const opts = content.options ?? [];
      if (opts.length > 0 && !opts.includes(answer)) {
        return {
          valid: false,
          parsed: answer,
          error: `Answer must be one of: ${opts.join(", ")}`,
        };
      }
      return { valid: true, parsed: answer };
    }

    case "CHECKBOX": {
      if (!Array.isArray(answer)) {
        return { valid: false, parsed: answer, error: "Answer must be an array" };
      }
      const opts = content.options ?? [];
      if (opts.length > 0) {
        const invalid = (answer as string[]).filter((a) => !opts.includes(a));
        if (invalid.length > 0) {
          return {
            valid: false,
            parsed: answer,
            error: `Invalid options: ${invalid.join(", ")}. Must be from: ${opts.join(", ")}`,
          };
        }
      }
      return { valid: true, parsed: answer };
    }

    case "LIKERT":
    case "RATING":
    case "CUSTOMER_SATISFACTION": {
      const num = typeof answer === "number" ? answer : Number(answer);
      if (isNaN(num) || !Number.isInteger(num)) {
        return { valid: false, parsed: answer, error: "Answer must be a whole number" };
      }
      const s = content.scale ?? { min: 1, max: 5 };
      if (num < s.min || num > s.max) {
        return { valid: false, parsed: answer, error: `Answer must be between ${s.min} and ${s.max}` };
      }
      return { valid: true, parsed: num };
    }

    case "NPS": {
      const num = typeof answer === "number" ? answer : Number(answer);
      if (isNaN(num) || !Number.isInteger(num) || num < 0 || num > 10) {
        return { valid: false, parsed: answer, error: "Answer must be a whole number 0-10" };
      }
      return { valid: true, parsed: num };
    }

    case "SLIDER":
    case "NUMBER":
    case "PERCENTAGE": {
      const num = typeof answer === "number" ? answer : Number(answer);
      if (isNaN(num)) {
        return { valid: false, parsed: answer, error: "Answer must be a number" };
      }
      return { valid: true, parsed: num };
    }

    case "MATRIX": {
      if (typeof answer !== "object" || answer === null || Array.isArray(answer)) {
        return { valid: false, parsed: answer, error: "Answer must be an object mapping rows to columns" };
      }
      const rows = content.rows ?? [];
      const cols = content.columns ?? [];
      const obj = answer as Record<string, string>;
      if (rows.length > 0) {
        for (const row of rows) {
          if (!(row in obj)) {
            return { valid: false, parsed: answer, error: `Missing answer for row: ${row}` };
          }
          if (cols.length > 0 && !cols.includes(obj[row])) {
            return {
              valid: false,
              parsed: answer,
              error: `Invalid column "${obj[row]}" for row "${row}". Must be one of: ${cols.join(", ")}`,
            };
          }
        }
      }
      return { valid: true, parsed: answer };
    }

    case "RANKING": {
      if (!Array.isArray(answer)) {
        return { valid: false, parsed: answer, error: "Answer must be an array" };
      }
      const opts = content.options ?? [];
      if (opts.length > 0) {
        if ((answer as string[]).length !== opts.length) {
          return {
            valid: false,
            parsed: answer,
            error: `Must rank all ${opts.length} items`,
          };
        }
        const sorted1 = [...(answer as string[])].sort();
        const sorted2 = [...opts].sort();
        if (JSON.stringify(sorted1) !== JSON.stringify(sorted2)) {
          return {
            valid: false,
            parsed: answer,
            error: `Must include exactly these items: ${opts.join(", ")}`,
          };
        }
      }
      return { valid: true, parsed: answer };
    }

    case "YES_NO": {
      const str = String(answer).toLowerCase();
      if (str !== "yes" && str !== "no") {
        return { valid: false, parsed: answer, error: 'Answer must be "yes" or "no"' };
      }
      return { valid: true, parsed: str };
    }

    case "FREE_TEXT":
    case "SHORT_TEXT":
    case "DATE":
    case "DATE_TIME":
    case "EMAIL":
    case "URL":
    case "PHONE_NUMBER": {
      if (typeof answer !== "string" || answer.trim().length === 0) {
        return { valid: false, parsed: answer, error: "Answer must be a non-empty string" };
      }
      return { valid: true, parsed: answer };
    }

    default:
      return { valid: true, parsed: answer };
  }
}

function extractJSON(raw: string): string | null {
  // Try direct parse first
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) return trimmed;

  // Handle markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find JSON object in the text
  const braceMatch = trimmed.match(/\{[\s\S]*\}/);
  if (braceMatch) return braceMatch[0];

  return null;
}
