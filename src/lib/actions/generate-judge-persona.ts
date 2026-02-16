"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import { getServerSupabase, BUCKET } from "@/lib/supabase";
import { extractCvText } from "@/lib/ai/extract-cv-text";

interface PersonaData {
  id: string;
  name: string;
  title: string;
  description: string;
  cvFileName: string;
  createdAt: string;
}

type GenerateResult =
  | { success: true; persona: PersonaData }
  | { success: false; error: string };

export async function generatePersonaFromSession(data: {
  surveyId: string;
  sessionId: string;
}): Promise<GenerateResult> {
  try {
    const authSession = await auth();
    if (!authSession?.user?.id) return { success: false, error: "Unauthorized" };

    await requireAccess(data.surveyId, authSession.user.id, "editor");

    // Check for existing persona from this session
    const existing = await db.judgePersona.findUnique({
      where: { sourceSessionId: data.sessionId },
    });
    if (existing) return { success: false, error: "A persona has already been generated from this session" };

    // Fetch session with comparisons
    const session = await db.surveySession.findUnique({
      where: { id: data.sessionId },
      select: {
        id: true,
        participantEmail: true,
        judgeDemographics: true,
        comparisons: {
          where: { winnerId: { not: null } },
          orderBy: { position: "asc" },
          select: {
            leftItem: { select: { label: true } },
            rightItem: { select: { label: true } },
            winner: { select: { id: true } },
            leftItemId: true,
            rightItemId: true,
          },
        },
      },
    });

    if (!session) return { success: false, error: "Session not found" };

    const demographics = session.judgeDemographics as Record<string, unknown> | null;
    if (!demographics?.cvFileUrl) return { success: false, error: "Session has no CV upload" };

    // Download CV from Supabase Storage
    const cvUrl = demographics.cvFileUrl as string;
    const cvFileName = (demographics.cvFileName as string) || "cv.pdf";

    // Extract the storage path from the public URL
    // Public URL format: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const pathMatch = cvUrl.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (!pathMatch) return { success: false, error: "Cannot parse CV storage path from URL" };
    const storagePath = decodeURIComponent(pathMatch[1]);

    const supabase = getServerSupabase();
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(storagePath);
    if (downloadError || !fileData) return { success: false, error: "Failed to download CV file" };

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const cvText = await extractCvText(buffer, cvFileName);
    if (!cvText.trim()) return { success: false, error: "No text could be extracted from CV" };

    // Build description from comparison history
    const comparisonLines = session.comparisons
      .filter((c) => c.winner != null)
      .map((c) => {
        const winnerLabel =
          c.winner!.id === c.leftItemId ? c.leftItem.label : c.rightItem.label;
        const loserLabel =
          c.winner!.id === c.leftItemId ? c.rightItem.label : c.leftItem.label;
        return `- Selected "${winnerLabel}" over "${loserLabel}"`;
      });

    const jobTitle = (demographics.jobTitle as string) || "";
    const employer = (demographics.employer as string) || "";
    const hiringExp = demographics.hasHiringExperience
      ? `Has hiring experience in: ${(demographics.hiringRoles as string[] || []).join(", ") || "general hiring"}.`
      : "No direct hiring experience.";

    const description = [
      jobTitle && employer
        ? `${jobTitle} at ${employer}.`
        : jobTitle || employer || "Professional judge.",
      hiringExp,
      "",
      comparisonLines.length > 0
        ? `Comparison history (${comparisonLines.length} judgments):\n${comparisonLines.join("\n")}`
        : "No completed comparisons recorded.",
    ].join("\n");

    // Derive name
    const name =
      jobTitle && employer
        ? `${jobTitle} at ${employer}`
        : session.participantEmail || "Survey Judge";

    const title = jobTitle || "Judge";

    const persona = await db.judgePersona.create({
      data: {
        name,
        title,
        description,
        cvText,
        cvFileName,
        createdById: authSession.user.id,
        sourceSessionId: data.sessionId,
      },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        cvFileName: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      persona: {
        ...persona,
        createdAt: persona.createdAt.toISOString(),
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to generate persona" };
  }
}
