import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  action: z.enum(["skip", "next"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    if (parsed.action === "skip") {
      await db.checkpoint.upsert({
        where: {
          sessionId_questionId: {
            sessionId: parsed.sessionId,
            questionId: parsed.questionId,
          },
        },
        create: {
          sessionId: parsed.sessionId,
          questionId: parsed.questionId,
          skipped: true,
          validatedAt: new Date(),
        },
        update: {
          skipped: true,
          validatedAt: new Date(),
        },
      });

      return NextResponse.json({ success: true, status: "skipped" });
    }

    // action === "next" — respondent clicked "Next" after seeing TapIn green checkmark
    await db.checkpoint.upsert({
      where: {
        sessionId_questionId: {
          sessionId: parsed.sessionId,
          questionId: parsed.questionId,
        },
      },
      create: {
        sessionId: parsed.sessionId,
        questionId: parsed.questionId,
        verified: true,
        validatedAt: new Date(),
      },
      update: {
        verified: true,
        validatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, status: "verified" });
  } catch (error) {
    console.error("[Checkpoint]", error);
    const message = error instanceof Error ? error.message : "Checkpoint operation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
