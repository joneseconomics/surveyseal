import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { VerificationStatus } from "@/generated/prisma/client";
import { z } from "zod";
import { computeBotScore } from "@/lib/bot-scoring";
import type { QuestionTelemetry, AutomationCheckResult } from "@/lib/bot-detection";

const automationCheckSchema = z.object({
  webdriverDetected: z.boolean(),
  phantomDetected: z.boolean(),
  noPlugins: z.boolean(),
  noLanguages: z.boolean(),
  suspicious: z.boolean(),
}).nullable().optional();

const requestSchema = z.object({
  sessionId: z.string(),
  automationCheck: automationCheckSchema,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    const session = await db.surveySession.findUnique({
      where: { id: parsed.sessionId, status: "ACTIVE" },
      include: {
        verificationPoints: true,
        comparisons: true,
        survey: {
          include: {
            questions: {
              where: { isVerificationPoint: true },
            },
            cjItems: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
    }

    const isCJ = session.survey.type === "COMPARATIVE_JUDGMENT";

    // For CJ surveys, check that all comparisons have been judged
    if (isCJ) {
      const unjudged = session.comparisons.filter((c) => c.winnerId === null);
      if (unjudged.length > 0) {
        return NextResponse.json(
          { error: `${unjudged.length} comparison(s) not yet judged` },
          { status: 400 }
        );
      }
    }

    // All verification points must be either verified or skipped
    const vpQuestionIds = new Set(
      session.survey.questions.map((q) => q.id)
    );

    const resolvedVPs = session.verificationPoints.filter(
      (cp) => cp.validatedAt !== null && vpQuestionIds.has(cp.questionId)
    );

    if (resolvedVPs.length !== session.survey.questions.length) {
      return NextResponse.json(
        {
          error: `Not all verification points resolved (${resolvedVPs.length}/${session.survey.questions.length})`,
        },
        { status: 400 }
      );
    }

    // Compute verification status
    const verifiedCount = resolvedVPs.filter((cp) => cp.verified).length;
    const totalVerificationPoints = session.survey.questions.length;

    let verificationStatus: VerificationStatus;
    if (verifiedCount === totalVerificationPoints) {
      verificationStatus = "VERIFIED";
    } else if (verifiedCount === 0) {
      verificationStatus = "UNVERIFIED";
    } else {
      verificationStatus = "PARTIAL";
    }

    // Compute bot score from telemetry
    let botScore: number | undefined;
    let botSignals: object | undefined;
    try {
      const responses = await db.response.findMany({
        where: { sessionId: session.id, telemetry: { not: Prisma.JsonNull } },
        select: { telemetry: true },
      });
      const telemetries = responses
        .map((r) => r.telemetry as unknown as QuestionTelemetry)
        .filter(Boolean);
      const automationCheck = (parsed.automationCheck ?? null) as AutomationCheckResult | null;
      const result = computeBotScore(telemetries, automationCheck);
      botScore = result.botScore;
      botSignals = result.botSignals;
    } catch (e) {
      console.error("[Bot Scoring]", e);
    }

    // Mark session as completed with verification status and bot score
    await db.surveySession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        verificationStatus,
        ...(botScore !== undefined && { botScore }),
        ...(botSignals && { botSignals }),
      },
    });

    return NextResponse.json({ success: true, verificationStatus });
  } catch (error) {
    console.error("[Survey Submit]", error);
    const message = error instanceof Error ? error.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
