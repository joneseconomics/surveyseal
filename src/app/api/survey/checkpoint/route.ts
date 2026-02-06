import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPhrase } from "@/lib/crypto/phrase";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string(),
  questionId: z.string(),
  word1: z.string().min(1),
  word2: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    // Find the checkpoint record
    const checkpoint = await db.checkpoint.findUnique({
      where: {
        sessionId_questionId: {
          sessionId: parsed.sessionId,
          questionId: parsed.questionId,
        },
      },
    });

    if (!checkpoint) {
      return NextResponse.json(
        { error: "Checkpoint not found. Please tap your NFC card first." },
        { status: 404 }
      );
    }

    if (checkpoint.validatedAt) {
      return NextResponse.json({ error: "Checkpoint already validated" }, { status: 400 });
    }

    // Check expiry
    if (new Date() > checkpoint.expiresAt) {
      return NextResponse.json(
        { error: "Phrase has expired. Please tap your NFC card again." },
        { status: 400 }
      );
    }

    // Verify phrase
    const isValid = verifyPhrase(parsed.word1, parsed.word2, checkpoint.phraseHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid phrase. Please try again." }, { status: 400 });
    }

    // Mark checkpoint as validated
    await db.checkpoint.update({
      where: { id: checkpoint.id },
      data: { validatedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Checkpoint Validate]", error);
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
