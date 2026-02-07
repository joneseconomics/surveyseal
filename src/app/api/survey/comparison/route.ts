import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";
import { updateRatings } from "@/lib/cj/scoring";

const requestSchema = z.object({
  sessionId: z.string(),
  comparisonId: z.string(),
  winnerId: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);

    const comparison = await db.comparison.findUnique({
      where: { id: parsed.comparisonId },
      include: {
        session: { select: { status: true } },
        leftItem: { select: { id: true, mu: true, sigmaSq: true, comparisonCount: true } },
        rightItem: { select: { id: true, mu: true, sigmaSq: true, comparisonCount: true } },
      },
    });

    if (!comparison) {
      return NextResponse.json({ error: "Comparison not found" }, { status: 404 });
    }

    if (comparison.sessionId !== parsed.sessionId) {
      return NextResponse.json({ error: "Session mismatch" }, { status: 400 });
    }

    if (comparison.session.status !== "ACTIVE") {
      return NextResponse.json({ error: "Session is not active" }, { status: 400 });
    }

    if (comparison.winnerId !== null) {
      return NextResponse.json({ error: "Comparison already judged" }, { status: 400 });
    }

    if (
      parsed.winnerId !== comparison.leftItemId &&
      parsed.winnerId !== comparison.rightItemId
    ) {
      return NextResponse.json({ error: "Winner must be one of the two items" }, { status: 400 });
    }

    // Determine winner and loser
    const isLeftWinner = parsed.winnerId === comparison.leftItemId;
    const winnerItem = isLeftWinner ? comparison.leftItem : comparison.rightItem;
    const loserItem = isLeftWinner ? comparison.rightItem : comparison.leftItem;

    const result = updateRatings(
      { mu: winnerItem.mu, sigmaSq: winnerItem.sigmaSq },
      { mu: loserItem.mu, sigmaSq: loserItem.sigmaSq }
    );

    await db.$transaction([
      db.comparison.update({
        where: { id: parsed.comparisonId },
        data: { winnerId: parsed.winnerId, judgedAt: new Date() },
      }),
      db.cJItem.update({
        where: { id: winnerItem.id },
        data: {
          mu: result.winner.mu,
          sigmaSq: result.winner.sigmaSq,
          comparisonCount: { increment: 1 },
        },
      }),
      db.cJItem.update({
        where: { id: loserItem.id },
        data: {
          mu: result.loser.mu,
          sigmaSq: result.loser.sigmaSq,
          comparisonCount: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Comparison]", error);
    const message = error instanceof Error ? error.message : "Comparison failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
