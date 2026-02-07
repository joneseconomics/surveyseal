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
        verificationPoints: true,
        survey: {
          include: {
            questions: {
              where: { isVerificationPoint: true },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
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
