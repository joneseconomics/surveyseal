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

    if (
      parsed.winnerId !== comparison.leftItemId &&
      parsed.winnerId !== comparison.rightItemId
    ) {
      return NextResponse.json({ error: "Winner must be one of the two items" }, { status: 400 });
    }

    // ─── Re-judgment: same winner → no-op ─────────────────────────
    if (comparison.winnerId === parsed.winnerId) {
      return NextResponse.json({ success: true });
    }

    // ─── Re-judgment: different winner ─────────────────────────────
    if (comparison.winnerId !== null) {
      // We need stored snapshots to reverse the old judgment
      if (
        comparison.prevLeftMu == null ||
        comparison.prevLeftSigmaSq == null ||
        comparison.prevRightMu == null ||
        comparison.prevRightSigmaSq == null
      ) {
        return NextResponse.json(
          { error: "Cannot re-judge: missing rating snapshots" },
          { status: 400 }
        );
      }

      const prevLeft = { mu: comparison.prevLeftMu, sigmaSq: comparison.prevLeftSigmaSq };
      const prevRight = { mu: comparison.prevRightMu, sigmaSq: comparison.prevRightSigmaSq };

      // Compute what the old judgment produced
      const oldIsLeftWinner = comparison.winnerId === comparison.leftItemId;
      const oldWinner = oldIsLeftWinner ? prevLeft : prevRight;
      const oldLoser = oldIsLeftWinner ? prevRight : prevLeft;
      const oldResult = updateRatings(oldWinner, oldLoser);

      // Compute deltas the old judgment applied
      const oldWinnerDelta = {
        mu: oldResult.winner.mu - oldWinner.mu,
        sigmaSq: oldResult.winner.sigmaSq - oldWinner.sigmaSq,
      };
      const oldLoserDelta = {
        mu: oldResult.loser.mu - oldLoser.mu,
        sigmaSq: oldResult.loser.sigmaSq - oldLoser.sigmaSq,
      };

      // Subtract old deltas from current ratings to get adjusted baseline
      const adjustedLeft = {
        mu: comparison.leftItem.mu - (oldIsLeftWinner ? oldWinnerDelta.mu : oldLoserDelta.mu),
        sigmaSq: comparison.leftItem.sigmaSq - (oldIsLeftWinner ? oldWinnerDelta.sigmaSq : oldLoserDelta.sigmaSq),
      };
      const adjustedRight = {
        mu: comparison.rightItem.mu - (!oldIsLeftWinner ? oldWinnerDelta.mu : oldLoserDelta.mu),
        sigmaSq: comparison.rightItem.sigmaSq - (!oldIsLeftWinner ? oldWinnerDelta.sigmaSq : oldLoserDelta.sigmaSq),
      };

      // Apply new judgment on adjusted ratings
      const newIsLeftWinner = parsed.winnerId === comparison.leftItemId;
      const newWinner = newIsLeftWinner ? adjustedLeft : adjustedRight;
      const newLoser = newIsLeftWinner ? adjustedRight : adjustedLeft;
      const newResult = updateRatings(newWinner, newLoser);

      await db.$transaction([
        db.comparison.update({
          where: { id: parsed.comparisonId },
          data: {
            winnerId: parsed.winnerId,
            judgedAt: new Date(),
            prevLeftMu: adjustedLeft.mu,
            prevLeftSigmaSq: adjustedLeft.sigmaSq,
            prevRightMu: adjustedRight.mu,
            prevRightSigmaSq: adjustedRight.sigmaSq,
          },
        }),
        db.cJItem.update({
          where: { id: newIsLeftWinner ? comparison.leftItemId : comparison.rightItemId },
          data: {
            mu: newResult.winner.mu,
            sigmaSq: newResult.winner.sigmaSq,
            // comparisonCount stays unchanged
          },
        }),
        db.cJItem.update({
          where: { id: newIsLeftWinner ? comparison.rightItemId : comparison.leftItemId },
          data: {
            mu: newResult.loser.mu,
            sigmaSq: newResult.loser.sigmaSq,
          },
        }),
      ]);

      return NextResponse.json({ success: true });
    }

    // ─── First judgment ────────────────────────────────────────────
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
        data: {
          winnerId: parsed.winnerId,
          judgedAt: new Date(),
          prevLeftMu: comparison.leftItem.mu,
          prevLeftSigmaSq: comparison.leftItem.sigmaSq,
          prevRightMu: comparison.rightItem.mu,
          prevRightSigmaSq: comparison.rightItem.sigmaSq,
        },
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
