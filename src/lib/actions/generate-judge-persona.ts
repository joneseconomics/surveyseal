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
  cvText: string;
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

    // Fetch the clicked session to get its email
    const clickedSession = await db.surveySession.findUnique({
      where: { id: data.sessionId },
      select: { id: true, participantEmail: true },
    });
    if (!clickedSession) return { success: false, error: "Session not found" };

    const email = clickedSession.participantEmail;

    // Check for existing persona — by email (all sessions) or by session ID
    if (email) {
      const existingByEmail = await db.judgePersona.findFirst({
        where: {
          sourceSession: {
            participantEmail: email,
            surveyId: data.surveyId,
          },
        },
      });
      if (existingByEmail) {
        return { success: false, error: "A persona has already been generated for this judge" };
      }
    } else {
      const existing = await db.judgePersona.findUnique({
        where: { sourceSessionId: data.sessionId },
      });
      if (existing) {
        return { success: false, error: "A persona has already been generated from this session" };
      }
    }

    // Fetch all completed sessions for this email in this survey (or just this one)
    const sessionSelect = {
      id: true,
      participantEmail: true,
      judgeDemographics: true,
      completedAt: true,
      comparisons: {
        where: { winnerId: { not: null } } as const,
        orderBy: { position: "asc" } as const,
        select: {
          leftItem: { select: { label: true } },
          rightItem: { select: { label: true } },
          winner: { select: { id: true } },
          leftItemId: true,
          rightItemId: true,
        },
      },
    };

    let allSessions;
    if (email) {
      allSessions = await db.surveySession.findMany({
        where: {
          surveyId: data.surveyId,
          participantEmail: email,
          status: "COMPLETED",
        },
        orderBy: { completedAt: "desc" },
        select: sessionSelect,
      });
    } else {
      const s = await db.surveySession.findUnique({
        where: { id: data.sessionId },
        select: sessionSelect,
      });
      allSessions = s ? [s] : [];
    }

    if (allSessions.length === 0) {
      return { success: false, error: "No completed sessions found" };
    }

    // Use the latest session's demographics and CV (sorted desc by completedAt)
    const latestSession = allSessions[0];
    const demographics = latestSession.judgeDemographics as Record<string, unknown> | null;
    if (!demographics?.cvFileUrl) {
      return { success: false, error: "Latest session has no CV upload" };
    }

    // Download CV from Supabase Storage
    const cvUrl = demographics.cvFileUrl as string;
    const cvFileName = (demographics.cvFileName as string) || "cv.pdf";

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

    // Combine comparisons from ALL sessions
    const allComparisons = allSessions.flatMap((s) => s.comparisons);
    const comparisonLines = allComparisons
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

    const sessionNote =
      allSessions.length > 1
        ? `Combined from ${allSessions.length} judging sessions.`
        : "";

    const description = [
      jobTitle && employer
        ? `${jobTitle} at ${employer}.`
        : jobTitle || employer || "Professional judge.",
      hiringExp,
      sessionNote,
      "",
      comparisonLines.length > 0
        ? `Comparison history (${comparisonLines.length} judgments):\n${comparisonLines.join("\n")}`
        : "No completed comparisons recorded.",
    ]
      .filter((line) => line !== "" || comparisonLines.length > 0)
      .join("\n");

    // Derive name
    const name =
      jobTitle && employer
        ? `${jobTitle} at ${employer}`
        : email || "Survey Judge";

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
        cvText: true,
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
