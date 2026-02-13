/**
 * Offline test for AI Agent feature — validates prompt builder,
 * answer validator, CJ prompter, and provider configs without API calls.
 *
 * Usage:
 *   npx tsx scripts/test-ai-agent.ts
 */

import { AI_PROVIDERS, getProvider } from "../src/lib/ai/providers";
import { AI_PERSONAS, getPersona } from "../src/lib/ai/personas";
import { buildQuestionPrompt } from "../src/lib/ai/prompt-builder";
import { parseAndValidate } from "../src/lib/ai/answer-validator";
import { buildCJComparisonPrompt, parseCJResponse } from "../src/lib/ai/cj-prompter";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

// ── Test Provider Config ────────────────────────────────────────────────────

console.log("\n═══ Provider Config ═══");

assert(AI_PROVIDERS.length === 5, "5 providers defined");

for (const p of AI_PROVIDERS) {
  assert(!!p.id && !!p.name, `Provider ${p.id} has id and name`);
  assert(p.models.length > 0, `Provider ${p.id} has models`);
  assert(["openai", "anthropic", "google"].includes(p.wireFormat), `Provider ${p.id} has valid wire format`);
  assert(!!p.baseUrl, `Provider ${p.id} has base URL`);
  assert(p.models.some(m => m.id === p.defaultModel), `Provider ${p.id} default model exists in model list`);
}

const anthropic = getProvider("anthropic");
assert(anthropic !== undefined, "getProvider('anthropic') returns config");
assert(anthropic!.wireFormat === "anthropic", "Anthropic uses 'anthropic' wire format");
assert(anthropic!.defaultModel === "claude-sonnet-4-20250514", "Anthropic default is Claude Sonnet 4");

const openai = getProvider("openai");
assert(openai!.wireFormat === "openai", "OpenAI uses 'openai' wire format");

const google = getProvider("google");
assert(google!.wireFormat === "google", "Google uses 'google' wire format");

const groq = getProvider("groq");
assert(groq!.wireFormat === "openai", "Groq uses 'openai' wire format (OpenAI-compat)");

assert(getProvider("nonexistent") === undefined, "Unknown provider returns undefined");

// ── Test Personas ───────────────────────────────────────────────────────────

console.log("\n═══ Personas ═══");

assert(AI_PERSONAS.length === 10, "10 personas defined");

for (const p of AI_PERSONAS) {
  assert(!!p.id && !!p.name, `Persona ${p.id} has id and name`);
  assert(p.systemPrompt.length > 50, `Persona ${p.id} has substantial system prompt`);
  assert(!!p.description, `Persona ${p.id} has description`);
}

assert(getPersona("diligent-grad-student")?.name === "Diligent Graduate Student", "getPersona works");
assert(getPersona("nonexistent") === undefined, "Unknown persona returns undefined");

// ── Test Prompt Builder ─────────────────────────────────────────────────────

console.log("\n═══ Prompt Builder ═══");

const testPersonaPrompt = "You are a test persona.";

// MULTIPLE_CHOICE
const mcPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "MULTIPLE_CHOICE", {
  text: "What is your favorite color?",
  options: ["Red", "Blue", "Green"],
});
assert(mcPrompt.length === 2, "MC prompt has system + user messages");
assert(mcPrompt[0].role === "system", "First message is system");
assert(mcPrompt[1].role === "user", "Second message is user");
assert(mcPrompt[1].content.includes("Red, Blue, Green"), "MC prompt includes options");
assert(mcPrompt[1].content.includes('"answer"'), "MC prompt requests JSON format");

// LIKERT
const likertPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "LIKERT", {
  text: "Rate your satisfaction",
  scale: { min: 1, max: 7, minLabel: "Very Low", maxLabel: "Very High" },
});
assert(likertPrompt[1].content.includes("1 to 7"), "Likert includes scale range");
assert(likertPrompt[1].content.includes("Very Low"), "Likert includes min label");

// MATRIX
const matrixPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "MATRIX", {
  text: "Rate the following",
  rows: ["Quality", "Price"],
  columns: ["Poor", "Good", "Excellent"],
});
assert(matrixPrompt[1].content.includes("Quality, Price"), "Matrix includes rows");
assert(matrixPrompt[1].content.includes("Poor, Good, Excellent"), "Matrix includes columns");

// RANKING
const rankingPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "RANKING", {
  text: "Rank these items",
  options: ["A", "B", "C"],
});
assert(rankingPrompt[1].content.includes("A, B, C"), "Ranking includes options");

// FREE_TEXT
const freeTextPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "FREE_TEXT", {
  text: "Describe your experience",
});
assert(freeTextPrompt[1].content.includes("1-3 sentence"), "Free text prompt asks for sentences");

// YES_NO
const yesNoPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "YES_NO", {
  text: "Do you agree?",
});
assert(yesNoPrompt[1].content.includes("yes") && yesNoPrompt[1].content.includes("no"), "Yes/No includes both options");

// NPS
const npsPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "NPS", {
  text: "How likely to recommend?",
});
assert(npsPrompt[1].content.includes("0 to 10"), "NPS includes 0-10 scale");

// Retry with feedback
const retryPrompt = buildQuestionPrompt(testPersonaPrompt, "Test Survey", "MULTIPLE_CHOICE", {
  text: "Pick one",
  options: ["A", "B"],
}, "Answer must be A or B");
assert(retryPrompt[1].content.includes("previous answer was invalid"), "Retry prompt includes error feedback");

// ── Test Answer Validator ───────────────────────────────────────────────────

console.log("\n═══ Answer Validator ═══");

// MULTIPLE_CHOICE - valid
let result = parseAndValidate('{"answer": "Blue"}', "MULTIPLE_CHOICE", { options: ["Red", "Blue", "Green"] });
assert(result.valid && result.parsed === "Blue", "MC: valid answer accepted");

// MULTIPLE_CHOICE - invalid option
result = parseAndValidate('{"answer": "Yellow"}', "MULTIPLE_CHOICE", { options: ["Red", "Blue", "Green"] });
assert(!result.valid, "MC: invalid option rejected");

// LIKERT - valid
result = parseAndValidate('{"answer": 4}', "LIKERT", { scale: { min: 1, max: 7 } });
assert(result.valid && result.parsed === 4, "Likert: valid number accepted");

// LIKERT - out of range
result = parseAndValidate('{"answer": 8}', "LIKERT", { scale: { min: 1, max: 7 } });
assert(!result.valid, "Likert: out of range rejected");

// NPS - valid
result = parseAndValidate('{"answer": 9}', "NPS", {});
assert(result.valid && result.parsed === 9, "NPS: valid score accepted");

// NPS - out of range
result = parseAndValidate('{"answer": 11}', "NPS", {});
assert(!result.valid, "NPS: out of range rejected");

// CHECKBOX - valid
result = parseAndValidate('{"answer": ["A", "C"]}', "CHECKBOX", { options: ["A", "B", "C"] });
assert(result.valid, "Checkbox: valid selection accepted");

// CHECKBOX - invalid option
result = parseAndValidate('{"answer": ["A", "D"]}', "CHECKBOX", { options: ["A", "B", "C"] });
assert(!result.valid, "Checkbox: invalid option rejected");

// MATRIX - valid
result = parseAndValidate('{"answer": {"Quality": "Good", "Price": "Excellent"}}', "MATRIX", {
  rows: ["Quality", "Price"],
  columns: ["Poor", "Good", "Excellent"],
});
assert(result.valid, "Matrix: valid mapping accepted");

// MATRIX - missing row
result = parseAndValidate('{"answer": {"Quality": "Good"}}', "MATRIX", {
  rows: ["Quality", "Price"],
  columns: ["Poor", "Good", "Excellent"],
});
assert(!result.valid, "Matrix: missing row rejected");

// MATRIX - invalid column
result = parseAndValidate('{"answer": {"Quality": "Bad", "Price": "Good"}}', "MATRIX", {
  rows: ["Quality", "Price"],
  columns: ["Poor", "Good", "Excellent"],
});
assert(!result.valid, "Matrix: invalid column rejected");

// RANKING - valid
result = parseAndValidate('{"answer": ["B", "A", "C"]}', "RANKING", { options: ["A", "B", "C"] });
assert(result.valid, "Ranking: valid permutation accepted");

// RANKING - incomplete
result = parseAndValidate('{"answer": ["B", "A"]}', "RANKING", { options: ["A", "B", "C"] });
assert(!result.valid, "Ranking: incomplete list rejected");

// YES_NO - valid
result = parseAndValidate('{"answer": "yes"}', "YES_NO", {});
assert(result.valid && result.parsed === "yes", "Yes/No: valid answer accepted");

// YES_NO - invalid
result = parseAndValidate('{"answer": "maybe"}', "YES_NO", {});
assert(!result.valid, "Yes/No: invalid answer rejected");

// FREE_TEXT - valid
result = parseAndValidate('{"answer": "This is my response."}', "FREE_TEXT", {});
assert(result.valid, "Free text: valid answer accepted");

// FREE_TEXT - empty
result = parseAndValidate('{"answer": ""}', "FREE_TEXT", {});
assert(!result.valid, "Free text: empty string rejected");

// JSON extraction - markdown code fence
result = parseAndValidate('```json\n{"answer": "Blue"}\n```', "MULTIPLE_CHOICE", { options: ["Blue"] });
assert(result.valid && result.parsed === "Blue", "Extracts JSON from markdown code fence");

// JSON extraction - text around JSON
result = parseAndValidate('Sure, here is my answer: {"answer": 5} I hope that helps!', "LIKERT", { scale: { min: 1, max: 7 } });
assert(result.valid && result.parsed === 5, "Extracts JSON from surrounding text");

// Missing answer field
result = parseAndValidate('{"response": "Blue"}', "MULTIPLE_CHOICE", { options: ["Blue"] });
assert(!result.valid, "Missing answer field rejected");

// Not JSON at all
result = parseAndValidate('I choose Blue.', "MULTIPLE_CHOICE", { options: ["Blue"] });
assert(!result.valid, "Non-JSON string rejected");

// SLIDER
result = parseAndValidate('{"answer": 75}', "SLIDER", { min: 0, max: 100 });
assert(result.valid && result.parsed === 75, "Slider: valid value accepted");

// NUMBER
result = parseAndValidate('{"answer": 42}', "NUMBER", {});
assert(result.valid && result.parsed === 42, "Number: valid value accepted");

// PERCENTAGE
result = parseAndValidate('{"answer": 85}', "PERCENTAGE", {});
assert(result.valid && result.parsed === 85, "Percentage: valid value accepted");

// DATE
result = parseAndValidate('{"answer": "2025-06-15"}', "DATE", {});
assert(result.valid, "Date: valid date accepted");

// EMAIL
result = parseAndValidate('{"answer": "user@example.com"}', "EMAIL", {});
assert(result.valid, "Email: valid email accepted");

// String number coercion for LIKERT
result = parseAndValidate('{"answer": "4"}', "LIKERT", { scale: { min: 1, max: 7 } });
assert(result.valid && result.parsed === 4, "Likert: string number coerced");

// ── Test CJ Prompter ───────────────────────────────────────────────────────

console.log("\n═══ CJ Prompter ═══");

const cjMessages = buildCJComparisonPrompt(
  testPersonaPrompt,
  "Resume Study",
  "Which candidate is better?",
  "Consider both skills and experience.",
  { label: "Candidate A", content: { text: "John, 5 years experience", description: "Finance background" } },
  { label: "Candidate B", content: { text: "Jane, 3 years experience", description: "Engineering background" } },
);
assert(cjMessages.length === 2, "CJ prompt has 2 messages");
assert(cjMessages[0].content.includes("Resume Study"), "CJ system includes survey title");
assert(cjMessages[0].content.includes("Consider both skills"), "CJ system includes judge instructions");
assert(cjMessages[1].content.includes("Item A"), "CJ user message includes Item A");
assert(cjMessages[1].content.includes("Item B"), "CJ user message includes Item B");
assert(cjMessages[1].content.includes("John, 5 years"), "CJ user message includes item text");
assert(cjMessages[1].content.includes('"winner"'), "CJ prompt asks for winner JSON");

// CJ with retry feedback
const cjRetry = buildCJComparisonPrompt(
  testPersonaPrompt,
  "Test",
  "Which is better?",
  null,
  { label: "A", content: { text: "Foo" } },
  { label: "B", content: { text: "Bar" } },
  "Invalid format",
);
assert(cjRetry[1].content.includes("previous answer was invalid"), "CJ retry includes error feedback");

// CJ with file-only items (no text)
const cjFile = buildCJComparisonPrompt(
  testPersonaPrompt,
  "Test",
  "Which is better?",
  null,
  { label: "A", content: { fileUrl: "http://example.com/a.pdf", fileName: "a.pdf" } },
  { label: "B", content: { text: "Some text content" } },
);
assert(cjFile[1].content.includes("cannot be read as text"), "CJ file item shows fallback warning");

// CJ Response Parser
assert(parseCJResponse('{"winner": "A"}')?.winner === "A", "CJ parse: direct A");
assert(parseCJResponse('{"winner": "B"}')?.winner === "B", "CJ parse: direct B");
assert(parseCJResponse('```json\n{"winner": "A"}\n```')?.winner === "A", "CJ parse: code fence");
assert(parseCJResponse('I think Item A is better. {"winner": "A"}')?.winner === "A", "CJ parse: text + JSON");
assert(parseCJResponse('I pick C') === null, "CJ parse: invalid response returns null");
assert(parseCJResponse('{"winner": "C"}') === null, "CJ parse: invalid winner returns null");

// ── Test Question Type Coverage ─────────────────────────────────────────────

console.log("\n═══ Question Type Coverage ═══");

const allTypes = [
  "MULTIPLE_CHOICE", "LIKERT", "FREE_TEXT", "MATRIX", "RANKING",
  "SHORT_TEXT", "URL", "EMAIL", "YES_NO", "CUSTOMER_SATISFACTION",
  "NPS", "CHECKBOX", "RATING", "DATE", "DATE_TIME", "NUMBER",
  "PERCENTAGE", "SLIDER", "PHONE_NUMBER",
] as const;

for (const type of allTypes) {
  const prompt = buildQuestionPrompt(testPersonaPrompt, "Test", type, {
    text: "Test question",
    options: ["A", "B", "C"],
    scale: { min: 1, max: 5 },
    rows: ["R1", "R2"],
    columns: ["C1", "C2"],
    min: 0,
    max: 100,
    step: 1,
  });
  assert(prompt.length === 2 && prompt[1].content.includes("Test question"), `Prompt builds for ${type}`);
}

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n═══ Results: ${passed} passed, ${failed} failed ═══`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log("All tests passed!\n");
}
