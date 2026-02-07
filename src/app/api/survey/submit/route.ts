import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { VerificationStatus } from "@/generated/prisma/client";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    const session = await db.surveySession.findUnique({
      where: { id: parsed.sessionId, status: "ACTIVE" },
      include: {
        checkpoints: true,
        survey: {
          include: {
            questions: {
              where: { isCheckpoint: true },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
    }

    // All checkpoints must be either verified or skipped
    const checkpointQuestionIds = new Set(
      session.survey.questions.map((q) => q.id)
    );

    const resolvedCheckpoints = session.checkpoints.filter(
      (cp) => cp.validatedAt !== null && checkpointQuestionIds.has(cp.questionId)
    );

    if (resolvedCheckpoints.length !== session.survey.questions.length) {
      return NextResponse.json(
        {
          error: `Not all checkpoints resolved (${resolvedCheckpoints.length}/${session.survey.questions.length})`,
        },
        { status: 400 }
      );
    }

    // Compute verification status
    const verifiedCount = resolvedCheckpoints.filter((cp) => cp.verified).length;
    const totalCheckpoints = session.survey.questions.length;

    let verificationStatus: VerificationStatus;
    if (verifiedCount === totalCheckpoints) {
      verificationStatus = "VERIFIED";
    } else if (verifiedCount === 0) {
      verificationStatus = "UNVERIFIED";
    } else {
      verificationStatus = "PARTIAL";
    }

    // Mark session as completed with verification status
    await db.surveySession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        verificationStatus,
      },
    });

    return NextResponse.json({ success: true, verificationStatus });
  } catch (error) {
    console.error("[Survey Submit]", error);
    const message = error instanceof Error ? error.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
