"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import { callLLM } from "@/lib/ai/llm-client";
import { buildQuestionPrompt } from "@/lib/ai/prompt-builder";
import { parseAndValidate } from "@/lib/ai/answer-validator";
import { buildCJComparisonPrompt, parseCJResponse } from "@/lib/ai/cj-prompter";
import { resolvePersonaPrompt } from "@/lib/ai/resolve-persona";
import { resolvePersonaName, getPersona } from "@/lib/ai/personas";
import { selectNextPair, buildComparedPairKeys } from "@/lib/cj/adaptive-pairing";
import { updateRatings } from "@/lib/cj/scoring";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";

// ─── Update AI settings on Survey ─────────────────────────────────────────

export async function updateAiSettings(data: {
  surveyId: string;
  aiApiKey: string;
  aiProvider: string;
  aiModel: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(data.surveyId, session.user.id, "editor");

  // Save API key to user (private per-user), provider/model to survey (shared)
  if (data.aiApiKey !== "__KEEP__") {
    await db.user.update({
      where: { id: session.user.id },
      data: { aiApiKey: data.aiApiKey },
    });
  }

  await db.survey.update({
    where: { id: data.surveyId },
    data: {
      aiProvider: data.aiProvider,
      aiModel: data.aiModel,
    },
  });

  revalidatePath(`/dashboard/surveys/${data.surveyId}/ai-agent`);
}

// ─── Create AI Agent Run ──────────────────────────────────────────────────

export async function createAiAgentRun(data: {
  surveyId: string;
  provider: string;
  model: string;
  persona: string;
  sessionCount: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(data.surveyId, session.user.id, "editor");

  const [user, survey] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { aiApiKey: true },
    }),
    db.survey.findUnique({
      where: { id: data.surveyId },
      select: { status: true },
    }),
  ]);

  if (!survey) throw new Error("Survey not found");
  if (!user?.aiApiKey) throw new Error("AI API key not configured");
  if (survey.status !== "LIVE") throw new Error("Survey must be live to run AI agent");

  const run = await db.aiAgentRun.create({
    data: {
      surveyId: data.surveyId,
      userId: session.user.id,
      provider: data.provider,
      model: data.model,
      persona: data.persona,
      sessionCount: data.sessionCount,
    },
  });

  return { runId: run.id };
}

// ─── Create AI Session ────────────────────────────────────────────────────

export async function createAiSession(data: {
  surveyId: string;
  runId: string;
  provider: string;
  model: string;
  persona: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(data.surveyId, session.user.id, "editor");

  const survey = await db.survey.findUnique({
    where: { id: data.surveyId },
    select: {
      type: true,
      cjSubtype: true,
      comparisonsPerJudge: true,
      cjPrompt: true,
      cjJudgeInstructions: true,
      questions: {
        orderBy: { position: "asc" },
        select: { id: true, type: true, content: true, isVerificationPoint: true, position: true },
      },
      cjItems: { select: { id: true } },
    },
  });

  if (!survey) throw new Error("Survey not found");

  let personaName = resolvePersonaName(data.persona);
  let judgeDemographics: Prisma.InputJsonValue | undefined;

  // For judge personas, resolve the actual name and demographics from DB
  if (data.persona.startsWith("judge:")) {
    const judgeId = data.persona.slice("judge:".length);
    const judge = await db.judgePersona.findUnique({
      where: { id: judgeId },
      select: { name: true, title: true, cvText: true, cvFileName: true },
    });
    if (judge) {
      personaName = judge.name;
      if (survey.type === "COMPARATIVE_JUDGMENT" && survey.cjSubtype === "RESUMES") {
        judgeDemographics = {
          jobTitle: judge.title,
          hasHiringExperience: true,
          hiringRoles: ["hiringCommittee"],
          cvFileName: judge.cvFileName,
        };
      }
    }
  } else {
    // Catalog or generic persona — extract demographics from Persona data
    const catalogPersona = getPersona(data.persona);
    if (catalogPersona && survey.type === "COMPARATIVE_JUDGMENT" && survey.cjSubtype === "RESUMES") {
      const locationParts = catalogPersona.location?.split(", ") ?? [];
      judgeDemographics = {
        jobTitle: catalogPersona.title,
        employer: catalogPersona.employer,
        city: locationParts[0] || undefined,
        state: locationParts[1] || undefined,
        hasHiringExperience: true,
        hiringRoles: ["hiringCommittee"],
        ...(catalogPersona.catalogSlug ? { cvSlug: catalogPersona.catalogSlug } : {}),
      };
    }
  }

  const surveySession = await db.surveySession.create({
    data: {
      surveyId: data.surveyId,
      status: "ACTIVE",
      verificationStatus: "UNVERIFIED",
      isAiGenerated: true,
      aiPersona: personaName,
      aiProvider: data.provider,
      aiModel: data.model,
      aiRunId: data.runId,
      ...(judgeDemographics ? { judgeDemographics } : {}),
    },
  });

  if (survey.type === "QUESTIONNAIRE") {
    const questions = survey.questions.map((q) => ({
      id: q.id,
      type: q.type,
      content: q.content,
      isVerificationPoint: q.isVerificationPoint,
      position: q.position,
    }));
    return { sessionId: surveySession.id, questions, totalComparisons: 0 };
  } else {
    const totalComparisons =
      survey.comparisonsPerJudge ?? Math.max(survey.cjItems.length - 1, 1);
    return {
      sessionId: surveySession.id,
      questions: [],
      totalComparisons,
      cjPrompt: survey.cjPrompt,
      cjJudgeInstructions: survey.cjJudgeInstructions,
    };
  }
}

// ─── Execute single AI question ───────────────────────────────────────────

export async function executeAiQuestion(data: {
  surveyId: string;
  sessionId: string;
  questionId: string;
  questionType: string;
  questionContent: Record<string, unknown>;
  isVerificationPoint: boolean;
  provider: string;
  model: string;
  persona: string;
  surveyTitle: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Skip verification points — auto-create as skipped
  if (data.isVerificationPoint) {
    await db.verificationPoint.upsert({
      where: {
        sessionId_questionId: {
          sessionId: data.sessionId,
          questionId: data.questionId,
        },
      },
      create: {
        sessionId: data.sessionId,
        questionId: data.questionId,
        skipped: true,
        verified: false,
      },
      update: {},
    });
    return { success: true, skipped: true };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { aiApiKey: true },
  });
  if (!user?.aiApiKey) throw new Error("AI API key not configured");

  const systemPrompt = await resolvePersonaPrompt(data.persona);

  const questionType = data.questionType as import("@/generated/prisma/client").QuestionType;
  const content = data.questionContent as { text?: string; options?: string[]; scale?: { min: number; max: number; minLabel?: string; maxLabel?: string }; rows?: string[]; columns?: string[]; min?: number; max?: number; step?: number };

  // Build prompt and call LLM
  const messages = buildQuestionPrompt(
    systemPrompt,
    data.surveyTitle,
    questionType,
    content,
  );

  let llmResponse = await callLLM(data.provider, data.model, user.aiApiKey, messages);
  let validation = parseAndValidate(llmResponse.content, questionType, content);

  // Retry once on validation failure
  if (!validation.valid) {
    const retryMessages = buildQuestionPrompt(
      systemPrompt,
      data.surveyTitle,
      questionType,
      content,
      validation.error,
    );
    llmResponse = await callLLM(data.provider, data.model, user.aiApiKey, retryMessages);
    validation = parseAndValidate(llmResponse.content, questionType, content);

    if (!validation.valid) {
      throw new Error(`Failed to get valid answer: ${validation.error}`);
    }
  }

  // Save response
  await db.response.upsert({
    where: {
      sessionId_questionId: {
        sessionId: data.sessionId,
        questionId: data.questionId,
      },
    },
    create: {
      sessionId: data.sessionId,
      questionId: data.questionId,
      answer: validation.parsed as Prisma.InputJsonValue,
    },
    update: {
      answer: validation.parsed as Prisma.InputJsonValue,
    },
  });

  return { success: true, skipped: false };
}

// ─── Execute single AI CJ comparison ─────────────────────────────────────

export async function executeAiComparison(data: {
  surveyId: string;
  sessionId: string;
  comparisonIndex: number;
  provider: string;
  model: string;
  persona: string;
  surveyTitle: string;
  cjPrompt: string;
  cjJudgeInstructions: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const [user, survey] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { aiApiKey: true },
    }),
    db.survey.findUnique({
      where: { id: data.surveyId },
      select: {
        cjItems: {
          select: { id: true, mu: true, sigmaSq: true, comparisonCount: true, label: true, content: true },
        },
        questions: {
          where: { isVerificationPoint: true },
          select: { id: true, position: true },
          orderBy: { position: "asc" },
        },
      },
    }),
  ]);
  if (!user?.aiApiKey) throw new Error("AI API key not configured");
  if (!survey) throw new Error("Survey not found");

  // Check if this index hits a verification point
  const vpPositions = getVPPositions(survey.questions.length, data.comparisonIndex);
  if (vpPositions.length > 0) {
    for (const vpQ of survey.questions) {
      await db.verificationPoint.upsert({
        where: {
          sessionId_questionId: {
            sessionId: data.sessionId,
            questionId: vpQ.id,
          },
        },
        create: {
          sessionId: data.sessionId,
          questionId: vpQ.id,
          skipped: true,
          verified: false,
        },
        update: {},
      });
    }
  }

  // Get existing comparisons for this session to find compared pair keys
  const existingComparisons = await db.comparison.findMany({
    where: { sessionId: data.sessionId },
    select: { leftItemId: true, rightItemId: true },
  });
  const comparedKeys = buildComparedPairKeys(existingComparisons);

  // Select next pair
  const pair = selectNextPair(
    survey.cjItems.map((item) => ({
      id: item.id,
      mu: item.mu,
      sigmaSq: item.sigmaSq,
    })),
    comparedKeys,
  );

  if (!pair) {
    return { success: true, done: true, noPairsLeft: true };
  }

  // Create comparison record
  const comparison = await db.comparison.create({
    data: {
      sessionId: data.sessionId,
      leftItemId: pair.left.id,
      rightItemId: pair.right.id,
      position: data.comparisonIndex,
    },
  });

  // Get full item data for prompt
  const leftItem = survey.cjItems.find((i) => i.id === pair.left.id)!;
  const rightItem = survey.cjItems.find((i) => i.id === pair.right.id)!;

  const systemPrompt = await resolvePersonaPrompt(data.persona);

  const messages = buildCJComparisonPrompt(
    systemPrompt,
    data.surveyTitle,
    data.cjPrompt,
    data.cjJudgeInstructions,
    { label: leftItem.label, content: leftItem.content as Record<string, string> },
    { label: rightItem.label, content: rightItem.content as Record<string, string> },
  );

  let llmResponse = await callLLM(data.provider, data.model, user.aiApiKey, messages);
  let result = parseCJResponse(llmResponse.content);

  // Retry once
  if (!result) {
    const retryMessages = buildCJComparisonPrompt(
      systemPrompt,
      data.surveyTitle,
      data.cjPrompt,
      data.cjJudgeInstructions,
      { label: leftItem.label, content: leftItem.content as Record<string, string> },
      { label: rightItem.label, content: rightItem.content as Record<string, string> },
      "Response must be exactly {\"winner\": \"A\"} or {\"winner\": \"B\"}",
    );
    llmResponse = await callLLM(data.provider, data.model, user.aiApiKey, retryMessages);
    result = parseCJResponse(llmResponse.content);

    if (!result) {
      throw new Error("Failed to get valid comparison judgment");
    }
  }

  // Determine winner
  const winnerId = result.winner === "A" ? pair.left.id : pair.right.id;
  const winnerItem = winnerId === leftItem.id ? leftItem : rightItem;
  const loserItem = winnerId === leftItem.id ? rightItem : leftItem;

  const ratingUpdate = updateRatings(
    { mu: winnerItem.mu, sigmaSq: winnerItem.sigmaSq },
    { mu: loserItem.mu, sigmaSq: loserItem.sigmaSq },
  );

  await db.$transaction([
    db.comparison.update({
      where: { id: comparison.id },
      data: {
        winnerId,
        judgedAt: new Date(),
        prevLeftMu: leftItem.mu,
        prevLeftSigmaSq: leftItem.sigmaSq,
        prevRightMu: rightItem.mu,
        prevRightSigmaSq: rightItem.sigmaSq,
      },
    }),
    db.cJItem.update({
      where: { id: winnerItem.id },
      data: {
        mu: ratingUpdate.winner.mu,
        sigmaSq: ratingUpdate.winner.sigmaSq,
        comparisonCount: { increment: 1 },
      },
    }),
    db.cJItem.update({
      where: { id: loserItem.id },
      data: {
        mu: ratingUpdate.loser.mu,
        sigmaSq: ratingUpdate.loser.sigmaSq,
        comparisonCount: { increment: 1 },
      },
    }),
  ]);

  return { success: true, done: false };
}

// ─── Complete AI Session ──────────────────────────────────────────────────

export async function completeAiSession(data: {
  sessionId: string;
  runId: string;
  surveyId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.surveySession.update({
    where: { id: data.sessionId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      verificationStatus: "UNVERIFIED",
      botScore: 1.0,
    },
  });

  await db.aiAgentRun.update({
    where: { id: data.runId },
    data: { completedCount: { increment: 1 } },
  });

  revalidatePath(`/dashboard/surveys/${data.surveyId}/responses`);

  return { success: true };
}

// ─── Fail AI Session ──────────────────────────────────────────────────────

export async function failAiSession(data: {
  sessionId: string;
  runId: string;
  error: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.surveySession.update({
    where: { id: data.sessionId },
    data: { status: "ABANDONED" },
  });

  const run = await db.aiAgentRun.findUnique({
    where: { id: data.runId },
    select: { errorLog: true },
  });

  const existingLog = run?.errorLog ?? "";
  const newLog = existingLog
    ? `${existingLog}\n${data.error}`
    : data.error;

  await db.aiAgentRun.update({
    where: { id: data.runId },
    data: {
      failedCount: { increment: 1 },
      errorLog: newLog,
    },
  });

  return { success: true };
}

// ─── Complete AI Agent Run ────────────────────────────────────────────────

export async function completeAiAgentRun(data: {
  runId: string;
  surveyId: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const run = await db.aiAgentRun.findUnique({
    where: { id: data.runId },
    select: { failedCount: true, sessionCount: true },
  });

  const status = run && run.failedCount === run.sessionCount ? "FAILED" : "COMPLETED";

  await db.aiAgentRun.update({
    where: { id: data.runId },
    data: {
      status,
      completedAt: new Date(),
    },
  });

  revalidatePath(`/dashboard/surveys/${data.surveyId}/ai-agent`);
  revalidatePath(`/dashboard/surveys/${data.surveyId}/responses`);

  return { success: true };
}

// ─── Get AI Agent Runs ────────────────────────────────────────────────────

export async function getAiAgentRuns(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "viewer");

  const runs = await db.aiAgentRun.findMany({
    where: { surveyId },
    orderBy: { startedAt: "desc" },
    take: 20,
    select: {
      id: true,
      provider: true,
      model: true,
      persona: true,
      sessionCount: true,
      completedCount: true,
      failedCount: true,
      status: true,
      startedAt: true,
      completedAt: true,
      errorLog: true,
    },
  });

  return runs;
}

// ─── Get AI settings for survey ───────────────────────────────────────────

export async function getAiSettings(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "viewer");

  const [user, survey] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { aiApiKey: true },
    }),
    db.survey.findUnique({
      where: { id: surveyId },
      select: {
        aiProvider: true,
        aiModel: true,
        title: true,
        type: true,
        status: true,
      },
    }),
  ]);

  if (!survey) throw new Error("Survey not found");

  return {
    hasApiKey: !!user?.aiApiKey,
    aiProvider: survey.aiProvider,
    aiModel: survey.aiModel,
    title: survey.title,
    type: survey.type,
    status: survey.status,
  };
}

// ─── Helper: determine VP positions for CJ ────────────────────────────────

function getVPPositions(vpCount: number, comparisonIndex: number): number[] {
  // For CJ, auto-skip all VPs at the start (index 0)
  if (comparisonIndex === 0 && vpCount > 0) {
    return Array.from({ length: vpCount }, (_, i) => i);
  }
  return [];
}
