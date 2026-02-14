import { db } from "@/lib/db";
import { getPersona } from "@/lib/ai/personas";

/**
 * Resolve the system prompt from a polymorphic persona value.
 * Server-only — uses DB for judge persona lookups.
 *
 * - Preset IDs (e.g. "diligent-grad-student") → looked up from AI_PERSONAS
 * - "personahub:<text>" → text used directly as system prompt
 * - "custom:<text>" → text used directly as system prompt
 * - "judge:<id>" → looked up from DB (JudgePersona)
 */
export async function resolvePersonaPrompt(persona: string): Promise<string> {
  if (persona.startsWith("personahub:")) {
    return persona.slice("personahub:".length);
  }
  if (persona.startsWith("custom:")) {
    return persona.slice("custom:".length);
  }
  if (persona.startsWith("judge:")) {
    const id = persona.slice("judge:".length);
    const judge = await db.judgePersona.findUnique({ where: { id } });
    if (!judge) return "You are a survey respondent.";
    return `You are ${judge.name}, ${judge.title}. ${judge.description}\n\nYou are participating in a survey. Draw on your full professional background, expertise, and personality as reflected in your CV below.\n\n=== CURRICULUM VITAE ===\n${judge.cvText}\n=== END CURRICULUM VITAE ===`;
  }
  return getPersona(persona)?.systemPrompt ?? "You are a survey respondent.";
}
