import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  action: z.enum(["skip", "check"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    if (parsed.action === "skip") {
      // Mark checkpoint as skipped
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

    // action === "check" — poll whether checkpoint has been verified by TapIn tap
    const checkpoint = await db.checkpoint.findUnique({
      where: {
        sessionId_questionId: {
          sessionId: parsed.sessionId,
          questionId: parsed.questionId,
        },
      },
    });

    if (checkpoint?.verified) {
      return NextResponse.json({ success: true, status: "verified" });
    }

    return NextResponse.json({ success: false, status: "pending" });
  } catch (error) {
    console.error("[Checkpoint]", error);
    const message = error instanceof Error ? error.message : "Checkpoint operation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
