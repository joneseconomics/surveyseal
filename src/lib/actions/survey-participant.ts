"use server";

import { db } from "@/lib/db";
import { getSurveySessionId, clearSurveySessionId } from "@/lib/session";

export async function abandonSession(surveyId: string) {
  const sessionId = await getSurveySessionId(surveyId);
  if (!sessionId) return;

  // Delete the session — cascades handle responses, VPs, comparisons, tapin taps
  await db.surveySession.delete({
    where: { id: sessionId },
  }).catch(() => {
    // Session may already be deleted; ignore
  });

  await clearSurveySessionId(surveyId);
}
