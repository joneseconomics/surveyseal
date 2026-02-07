import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().email(),
  surveyId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    // Find ACTIVE sessions for this surveyId where participantEmail matches
    const session = await db.surveySession.findFirst({
      where: {
        surveyId: parsed.surveyId,
        participantEmail: parsed.email.toLowerCase(),
        status: "ACTIVE",
      },
      include: {
        checkpoints: { orderBy: { createdAt: "asc" } },
        survey: {
          include: {
            questions: {
              where: { isCheckpoint: true },
              orderBy: { position: "asc" },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json(
        { error: "No active session found for this email and survey" },
        { status: 404 }
      );
    }

    // Find the next unverified, unskipped checkpoint
    const checkpointQuestions = session.survey.questions;
    const existingCheckpoints = new Map(
      session.checkpoints.map((cp) => [cp.questionId, cp])
    );

    let targetQuestion = null;
    for (const q of checkpointQuestions) {
      const cp = existingCheckpoints.get(q.id);
      if (!cp || (!cp.verified && !cp.skipped)) {
        targetQuestion = q;
        break;
      }
    }

    if (!targetQuestion) {
      return NextResponse.json(
        { error: "All checkpoints already verified or skipped" },
        { status: 400 }
      );
    }

    // Mark it as verified via upsert
    await db.checkpoint.upsert({
      where: {
        sessionId_questionId: {
          sessionId: session.id,
          questionId: targetQuestion.id,
        },
      },
      create: {
        sessionId: session.id,
        questionId: targetQuestion.id,
        verified: true,
        verifiedEmail: parsed.email.toLowerCase(),
        validatedAt: new Date(),
      },
      update: {
        verified: true,
        verifiedEmail: parsed.email.toLowerCase(),
        validatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      checkpointPosition: targetQuestion.position,
    });
  } catch (error) {
    console.error("[TapIn Verify]", error);
    const message = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
