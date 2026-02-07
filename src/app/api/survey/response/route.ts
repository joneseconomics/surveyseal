import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  answer: z.unknown(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    // Verify session is active
    const session = await db.surveySession.findUnique({
      where: { id: parsed.sessionId, status: "ACTIVE" },
      include: { verificationPoints: true },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
    }

    // Verify the question belongs to the survey
    const question = await db.question.findUnique({
      where: { id: parsed.questionId, surveyId: session.surveyId },
    });

    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Server-side gating: ensure all preceding verification points are validated
    const precedingVPs = await db.question.findMany({
      where: {
        surveyId: session.surveyId,
        isVerificationPoint: true,
        position: { lt: question.position },
      },
    });

    const validatedVPIds = new Set(
      session.verificationPoints
        .filter((cp) => cp.validatedAt !== null)
        .map((cp) => cp.questionId)
    );

    for (const cp of precedingVPs) {
      if (!validatedVPIds.has(cp.id)) {
        return NextResponse.json(
          { error: "Preceding verification point not validated" },
          { status: 403 }
        );
      }
    }

    // Upsert response
    await db.response.upsert({
      where: {
        sessionId_questionId: {
          sessionId: parsed.sessionId,
          questionId: parsed.questionId,
        },
      },
      create: {
        sessionId: parsed.sessionId,
        questionId: parsed.questionId,
        answer: parsed.answer as object,
      },
      update: {
        answer: parsed.answer as object,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Response Submit]", error);
    const message = error instanceof Error ? error.message : "Failed to save response";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
