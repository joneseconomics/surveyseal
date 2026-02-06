import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
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

    // Verify all 3 checkpoints are validated
    const checkpointQuestionIds = new Set(
      session.survey.questions.map((q) => q.id)
    );

    const validatedCheckpoints = session.checkpoints.filter(
      (cp) => cp.validatedAt !== null && checkpointQuestionIds.has(cp.questionId)
    );

    if (validatedCheckpoints.length !== session.survey.questions.length) {
      return NextResponse.json(
        {
          error: `Not all checkpoints validated (${validatedCheckpoints.length}/${session.survey.questions.length})`,
        },
        { status: 400 }
      );
    }

    // Mark session as completed
    await db.surveySession.update({
      where: { id: session.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Survey Submit]", error);
    const message = error instanceof Error ? error.message : "Submission failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
