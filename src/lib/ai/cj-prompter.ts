import type { LLMMessage } from "./llm-client";

interface CJItemContent {
  text?: string;
  description?: string;
  imageUrl?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

export function buildCJComparisonPrompt(
  personaSystemPrompt: string,
  surveyTitle: string,
  cjPrompt: string,
  judgeInstructions: string | null,
  leftItem: { label: string; content: CJItemContent },
  rightItem: { label: string; content: CJItemContent },
  retryFeedback?: string,
): LLMMessage[] {
  const systemPrompt = `${personaSystemPrompt}

You are a judge in a comparative judgment study titled "${surveyTitle}". ${judgeInstructions ? judgeInstructions + "\n" : ""}You will compare two items and pick a winner. You MUST respond with ONLY valid JSON — no markdown, no explanation, no extra text.`;

  const leftDesc = formatItemForPrompt(leftItem, "A");
  const rightDesc = formatItemForPrompt(rightItem, "B");

  let userMsg = `${cjPrompt}

${leftDesc}

${rightDesc}

Which is better? Respond: {"winner": "A"} or {"winner": "B"}`;

  if (retryFeedback) {
    userMsg += `\n\nYour previous answer was invalid: ${retryFeedback}. Please respond with exactly {"winner": "A"} or {"winner": "B"}`;
  }

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMsg },
  ];
}

function formatItemForPrompt(
  item: { label: string; content: CJItemContent },
  letter: string,
): string {
  const parts: string[] = [`--- Item ${letter}: ${item.label} ---`];

  if (item.content.text) {
    parts.push(item.content.text);
  }
  if (item.content.description) {
    parts.push(item.content.description);
  }

  if (item.content.fileUrl && !item.content.text) {
    parts.push(`[This item has an attached file (${item.content.fileName ?? item.content.fileType ?? "file"}) that cannot be read as text. Judging is based on available text content only.]`);
  }

  if (item.content.imageUrl && !item.content.text) {
    parts.push(`[This item is an image. Text-only comparison — image content cannot be analyzed.]`);
  }

  if (parts.length === 1) {
    parts.push("[No text content available for this item]");
  }

  return parts.join("\n");
}

export function parseCJResponse(raw: string): { winner: "A" | "B" } | null {
  const trimmed = raw.trim();

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "");
    if (parsed.winner === "A" || parsed.winner === "B") {
      return { winner: parsed.winner };
    }
  } catch {
    // Fall through
  }

  // Handle markdown code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      if (parsed.winner === "A" || parsed.winner === "B") {
        return { winner: parsed.winner };
      }
    } catch {
      // Fall through
    }
  }

  return null;
}
