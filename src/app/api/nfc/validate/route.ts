import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateNtag424Sun } from "@/lib/crypto/nfc";
import { validateNfcMock } from "@/lib/crypto/nfc-mock";
import { generatePhrase, hashPhrase } from "@/lib/crypto/phrase";
import { z } from "zod";

const requestSchema = z.object({
  sessionId: z.string(),
  piccData: z.string().optional(),
  cmac: z.string().optional(),
  uid: z.string().optional(), // For mock mode
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    // Look up the active session
    const session = await db.surveySession.findUnique({
      where: { id: parsed.sessionId, status: "ACTIVE" },
      include: {
        survey: {
          include: {
            questions: {
              where: { isCheckpoint: true },
              orderBy: { position: "asc" },
            },
          },
        },
        checkpoints: true,
        card: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found or inactive" }, { status: 404 });
    }

    // Find next unvalidated checkpoint
    const validatedCheckpointQuestionIds = new Set(
      session.checkpoints
        .filter((cp) => cp.validatedAt !== null)
        .map((cp) => cp.questionId)
    );

    const nextCheckpointQuestion = session.survey.questions.find(
      (q) => !validatedCheckpointQuestionIds.has(q.id)
    );

    if (!nextCheckpointQuestion) {
      return NextResponse.json({ error: "All checkpoints already validated" }, { status: 400 });
    }

    // Validate NFC tap
    let uid: string;
    let counter: number;

    if (process.env.NFC_MOCK_MODE === "true") {
      const mockUid = parsed.uid ?? "04MOCK00000000";
      const result = await validateNfcMock(mockUid, session.survey.ownerId);
      uid = result.uid;
      counter = result.counter;
    } else {
      if (!parsed.piccData || !parsed.cmac) {
        return NextResponse.json({ error: "piccData and cmac required" }, { status: 400 });
      }

      // Look up card by trying to decrypt (we need to try all cards)
      // In practice, the URL from the NFC card contains a card identifier
      const card = session.card
        ? await db.card.findUnique({ where: { id: session.card.id } })
        : null;

      if (!card) {
        return NextResponse.json({ error: "No card associated with session" }, { status: 400 });
      }

      const result = validateNtag424Sun(parsed.piccData, parsed.cmac, card.aesKey);
      uid = result.uid;
      counter = result.counter;

      // Validate rolling counter
      if (counter <= card.rollingCounter) {
        return NextResponse.json(
          { error: "Rolling counter violation: possible replay attack" },
          { status: 400 }
        );
      }

      // Update card counter
      await db.card.update({
        where: { id: card.id },
        data: { rollingCounter: counter },
      });
    }

    // Generate phrase
    const { word1, word2, expiresAt } = generatePhrase(
      session.sessionSecret,
      uid,
      nextCheckpointQuestion.id
    );

    // Store checkpoint record
    const card = await db.card.findUnique({ where: { uid } });

    await db.checkpoint.upsert({
      where: {
        sessionId_questionId: {
          sessionId: session.id,
          questionId: nextCheckpointQuestion.id,
        },
      },
      create: {
        sessionId: session.id,
        questionId: nextCheckpointQuestion.id,
        cardId: card?.id,
        tapCounter: counter,
        phraseHash: hashPhrase(word1, word2),
        expiresAt,
      },
      update: {
        cardId: card?.id,
        tapCounter: counter,
        phraseHash: hashPhrase(word1, word2),
        expiresAt,
        validatedAt: null,
      },
    });

    // Link card to session if not already
    if (card && !session.cardId) {
      await db.surveySession.update({
        where: { id: session.id },
        data: { cardId: card.id },
      });
    }

    return NextResponse.json({
      word1,
      word2,
      expiresAt: expiresAt.toISOString(),
      checkpointPosition: nextCheckpointQuestion.position,
    });
  } catch (error) {
    console.error("[NFC Validate]", error);
    const message = error instanceof Error ? error.message : "Validation failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
