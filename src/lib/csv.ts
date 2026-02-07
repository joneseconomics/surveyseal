import type { QuestionTypeValue } from "@/lib/validations/survey";

// ─── CSV Parser ──────────────────────────────────────────────────────────────

/**
 * Parse CSV text into rows of string arrays.
 * Handles quoted fields (including escaped quotes "").
 */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    const row: string[] = [];
    while (i < len) {
      if (text[i] === '"') {
        // Quoted field
        i++; // skip opening quote
        let field = "";
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            field += text[i];
            i++;
          }
        }
        row.push(field);
        // skip comma or newline after field
        if (i < len && text[i] === ",") i++;
        else if (i < len && (text[i] === "\n" || text[i] === "\r")) {
          if (text[i] === "\r" && i + 1 < len && text[i + 1] === "\n") i += 2;
          else i++;
          break;
        }
      } else {
        // Unquoted field
        let field = "";
        while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i++;
        }
        row.push(field);
        if (i < len && text[i] === ",") {
          i++;
        } else if (i < len && (text[i] === "\n" || text[i] === "\r")) {
          if (text[i] === "\r" && i + 1 < len && text[i + 1] === "\n") i += 2;
          else i++;
          break;
        }
      }
    }
    if (row.length > 0 && !(row.length === 1 && row[0] === "")) {
      rows.push(row);
    }
  }
  return rows;
}

// ─── SurveyVista Type Mapping ────────────────────────────────────────────────

const CSV_TYPE_MAP: Record<string, QuestionTypeValue> = {
  // SurveyVista internal names
  "Text-Short": "SHORT_TEXT",
  "Text-Long": "FREE_TEXT",
  "Text-Rich": "FREE_TEXT",
  "Polar-Yes-No": "YES_NO",
  "Polar-CSAT": "CUSTOMER_SATISFACTION",
  "Polar-Radio": "MULTIPLE_CHOICE",
  "Scale-Numeric": "LIKERT",
  "Scale-NPS": "NPS",
  "Scale-Image": "RATING",
  "Polar-Checkbox": "CHECKBOX",
  "Scale-Rating": "RATING",
  "Scale-Slider": "SLIDER",

  // SurveyVista human-readable names
  "Short Response": "SHORT_TEXT",
  "Long Response": "FREE_TEXT",
  "Rich Text Response": "FREE_TEXT",
  "Yes/No": "YES_NO",
  "Yes-No": "YES_NO",
  "Customer Satisfaction": "CUSTOMER_SATISFACTION",
  "Single Choice": "MULTIPLE_CHOICE",
  "Numeric Scale": "LIKERT",
  "Image Scale": "RATING",
  "Multiple Choice": "CHECKBOX",
  "Phone Number": "PHONE_NUMBER",
  "Date & Time": "DATE_TIME",

  // Direct matches (case-insensitive handled below)
  URL: "URL",
  Email: "EMAIL",
  NPS: "NPS",
  Rating: "RATING",
  Date: "DATE",
  DateTime: "DATE_TIME",
  Number: "NUMBER",
  Percentage: "PERCENTAGE",
  Slider: "SLIDER",
  Phone: "PHONE_NUMBER",
};

// Also accept our own internal type names directly
const INTERNAL_TYPES: Set<string> = new Set([
  "MULTIPLE_CHOICE", "LIKERT", "FREE_TEXT", "MATRIX", "RANKING",
  "SHORT_TEXT", "URL", "EMAIL", "YES_NO", "CUSTOMER_SATISFACTION",
  "NPS", "CHECKBOX", "RATING", "DATE", "DATE_TIME",
  "NUMBER", "PERCENTAGE", "SLIDER", "PHONE_NUMBER",
]);

function resolveType(csvType: string): QuestionTypeValue | null {
  const trimmed = csvType.trim();
  // Check internal types first
  if (INTERNAL_TYPES.has(trimmed)) return trimmed as QuestionTypeValue;
  // Check CSV map
  if (CSV_TYPE_MAP[trimmed]) return CSV_TYPE_MAP[trimmed];
  // Case-insensitive lookup
  const lower = trimmed.toLowerCase();
  for (const [key, val] of Object.entries(CSV_TYPE_MAP)) {
    if (key.toLowerCase() === lower) return val;
  }
  return null;
}

// ─── Content Builder ─────────────────────────────────────────────────────────

function buildContent(
  type: QuestionTypeValue,
  text: string,
  choicesRaw: string
): Record<string, unknown> {
  const choices = choicesRaw
    ? choicesRaw.split("~").map((c) => c.trim()).filter(Boolean)
    : [];

  switch (type) {
    case "MULTIPLE_CHOICE":
      return { text, options: choices.length >= 2 ? choices : undefined };
    case "CHECKBOX":
      return { text, options: choices.length >= 2 ? choices : undefined };
    case "RANKING":
      return { text, options: choices.length >= 2 ? choices : ["Option 1", "Option 2"] };
    case "LIKERT": {
      if (choices.length >= 2) {
        return {
          text,
          scale: {
            min: 1,
            max: choices.length,
            minLabel: choices[0],
            maxLabel: choices[choices.length - 1],
          },
        };
      }
      return { text, scale: { min: 1, max: 5 } };
    }
    case "SLIDER": {
      const min = choices.length > 0 ? Number(choices[0]) || 0 : 0;
      const max = choices.length > 1 ? Number(choices[1]) || 100 : 100;
      const step = choices.length > 2 ? Number(choices[2]) || undefined : undefined;
      return { text, min, max, step };
    }
    case "RATING": {
      const maxStars = choices.length > 0 ? Number(choices[0]) || 5 : 5;
      return { text, maxStars };
    }
    case "MATRIX": {
      // Choices format: rows separated by ~ then || then columns separated by ~
      // Fallback: just treat choices as rows
      return {
        text,
        rows: choices.length > 0 ? choices : ["Row 1"],
        columns: ["Column 1", "Column 2"],
      };
    }
    default:
      // All simple text-based types: SHORT_TEXT, FREE_TEXT, URL, EMAIL,
      // YES_NO, CUSTOMER_SATISFACTION, NPS, DATE, DATE_TIME, NUMBER,
      // PERCENTAGE, PHONE_NUMBER
      return { text };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface ParsedQuestion {
  type: QuestionTypeValue;
  content: Record<string, unknown>;
  section?: string;
}

export interface ParseError {
  row: number;
  message: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: ParseError[];
}

/**
 * Parse a SurveyVista-format CSV into question data.
 * Expected columns: Section, Question Text, Type, Choices (~ separated)
 */
export function parseQuestionCSV(text: string): ParseResult {
  const rows = parseCSV(text);
  if (rows.length === 0) return { questions: [], errors: [{ row: 0, message: "Empty CSV" }] };

  // Check if first row is a header
  const firstRow = rows[0];
  const isHeader =
    firstRow.length >= 3 &&
    firstRow.some(
      (cell) =>
        cell.toLowerCase().includes("section") ||
        cell.toLowerCase().includes("question") ||
        cell.toLowerCase().includes("type")
    );

  const dataRows = isHeader ? rows.slice(1) : rows;
  const questions: ParsedQuestion[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = isHeader ? i + 2 : i + 1; // 1-indexed, accounting for header

    if (row.length < 3) {
      errors.push({ row: rowNum, message: `Expected at least 3 columns, got ${row.length}` });
      continue;
    }

    const section = row[0].trim() || undefined;
    const questionText = row[1].trim();
    const csvType = row[2].trim();
    const choicesRaw = row.length > 3 ? row[3] : "";

    if (!questionText) {
      errors.push({ row: rowNum, message: "Empty question text" });
      continue;
    }

    const resolvedType = resolveType(csvType);
    if (!resolvedType) {
      errors.push({ row: rowNum, message: `Unknown question type: "${csvType}"` });
      continue;
    }

    const content = buildContent(resolvedType, questionText, choicesRaw);
    questions.push({ type: resolvedType, content, section });
  }

  return { questions, errors };
}
