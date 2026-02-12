"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { updateRatings } from "@/lib/cj/scoring";

export async function deleteSession(surveyId: string, sessionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true, type: true },
  });

  if (!survey) throw new Error("Survey not found");

  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";

  // Delete the session (cascades handle comparisons, responses, verification points, tapin taps)
  await db.surveySession.delete({
    where: { id: sessionId, surveyId },
  });

  // For CJ surveys, recalculate all item ratings from remaining comparisons
  if (isCJ) {
    // Get all items for this survey
    const items = await db.cJItem.findMany({
      where: { surveyId },
      select: { id: true },
    });

    // Reset all items to initial values
    await db.cJItem.updateMany({
      where: { surveyId },
      data: { mu: 1500, sigmaSq: 350_000, comparisonCount: 0 },
    });

    // Replay all remaining judged comparisons in chronological order
    const comparisons = await db.comparison.findMany({
      where: {
        session: { surveyId },
        winnerId: { not: null },
      },
      orderBy: { createdAt: "asc" },
      select: { leftItemId: true, rightItemId: true, winnerId: true },
    });

    if (comparisons.length > 0) {
      // Build in-memory rating map
      const ratings = new Map<string, { mu: number; sigmaSq: number; comparisonCount: number }>();
      for (const item of items) {
        ratings.set(item.id, { mu: 1500, sigmaSq: 350_000, comparisonCount: 0 });
      }

      for (const comp of comparisons) {
        const leftRating = ratings.get(comp.leftItemId);
        const rightRating = ratings.get(comp.rightItemId);
        if (!leftRating || !rightRating || !comp.winnerId) continue;

        const winner = comp.winnerId === comp.leftItemId ? leftRating : rightRating;
        const loser = comp.winnerId === comp.leftItemId ? rightRating : leftRating;

        const result = updateRatings(winner, loser);
        winner.mu = result.winner.mu;
        winner.sigmaSq = result.winner.sigmaSq;
        loser.mu = result.loser.mu;
        loser.sigmaSq = result.loser.sigmaSq;

        leftRating.comparisonCount++;
        rightRating.comparisonCount++;
      }

      // Batch update all items in a transaction
      await db.$transaction(
        Array.from(ratings.entries()).map(([id, r]) =>
          db.cJItem.update({
            where: { id },
            data: { mu: r.mu, sigmaSq: r.sigmaSq, comparisonCount: r.comparisonCount },
          })
        )
      );
    }
  }

  revalidatePath(`/dashboard/surveys/${surveyId}/responses`);
  revalidatePath(`/dashboard/surveys/${surveyId}/rankings`);
  revalidatePath(`/dashboard/surveys/${surveyId}`);
}
