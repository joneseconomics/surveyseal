"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createSurveySchema, updateSurveySchema, updateSurveySettingsSchema } from "@/lib/validations/survey";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchTapInTaps } from "@/lib/tapin";

export async function createSurvey(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createSurveySchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type") || "QUESTIONNAIRE",
  });

  const survey = await db.survey.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      type: parsed.type,
      ownerId: session.user.id,
      questions: {
        createMany: {
          data: [
            { position: 0, type: "FREE_TEXT", content: { text: "Opening Verification Point" }, isVerificationPoint: true },
            { position: 1, type: "FREE_TEXT", content: { text: "Mid-Survey Verification Point" }, isVerificationPoint: true },
            { position: 2, type: "FREE_TEXT", content: { text: "Closing Verification Point" }, isVerificationPoint: true },
          ],
        },
      },
    },
  });

  redirect(`/dashboard/surveys/${survey.id}`);
}

export async function updateSurvey(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = updateSurveySchema.parse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  await db.survey.update({
    where: { id: parsed.id, ownerId: session.user.id },
    data: { title: parsed.title, description: parsed.description },
  });

  revalidatePath(`/dashboard/surveys/${parsed.id}`);
}

export async function deleteSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.delete({
    where: { id: surveyId, ownerId: session.user.id },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function publishSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Validate that survey has exactly 3 verification points and the closing one is last
  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    include: {
      questions: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") throw new Error("Survey is not in draft state");

  const verificationPoints = survey.questions.filter((q) => q.isVerificationPoint);
  if (verificationPoints.length !== 3) {
    throw new Error(
      `Survey must have exactly 3 verification points to publish (found ${verificationPoints.length})`
    );
  }

  const lastQuestion = survey.questions[survey.questions.length - 1];
  const closingVP = verificationPoints[verificationPoints.length - 1];
  if (lastQuestion.id !== closingVP.id) {
    throw new Error(
      "The closing verification point must be the last item in the survey. No questions can come after it."
    );
  }

  await db.survey.update({
    where: { id: surveyId },
    data: { status: "LIVE" },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
  revalidatePath("/dashboard");
}

export async function updateSurveySettings(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = updateSurveySettingsSchema.parse({
    id: formData.get("id"),
    verificationPointTimerSeconds: formData.get("verificationPointTimerSeconds"),
    requireLogin: formData.get("requireLogin") === "on" || formData.get("requireLogin") === "true",
    tapinApiKey: formData.get("tapinApiKey") || undefined,
    tapinCampaignId: formData.get("tapinCampaignId") || undefined,
  });

  await db.survey.update({
    where: { id: parsed.id, ownerId: session.user.id },
    data: {
      verificationPointTimerSeconds: parsed.verificationPointTimerSeconds,
      requireLogin: parsed.requireLogin,
      tapinApiKey: parsed.tapinApiKey ?? null,
      tapinCampaignId: parsed.tapinCampaignId ?? null,
    },
  });

  revalidatePath(`/dashboard/surveys/${parsed.id}/settings`);
}

export async function reconcileTapIn(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    select: {
      tapinApiKey: true,
      tapinCampaignId: true,
      verificationPointTimerSeconds: true,
    },
  });

  if (!survey) throw new Error("Survey not found");
  if (!survey.tapinApiKey || !survey.tapinCampaignId) {
    throw new Error("TapIn API key and Group ID must be configured in Settings");
  }

  const sessions = await db.surveySession.findMany({
    where: { surveyId, status: "COMPLETED", participantEmail: { not: null } },
    select: {
      id: true,
      participantEmail: true,
      startedAt: true,
      completedAt: true,
    },
  });

  for (const s of sessions) {
    if (!s.participantEmail || !s.completedAt) continue;

    const from = s.startedAt;
    const to = new Date(s.completedAt.getTime() + survey.verificationPointTimerSeconds * 1000);

    const taps = await fetchTapInTaps(
      survey.tapinApiKey,
      survey.tapinCampaignId,
      s.participantEmail,
      from,
      to,
    );

    for (const tap of taps) {
      await db.tapInTap.upsert({
        where: {
          sessionId_tapinId: { sessionId: s.id, tapinId: tap.id },
        },
        create: {
          sessionId: s.id,
          tapinId: tap.id,
          email: tap.email,
          tappedAt: new Date(tap.tapped_at),
        },
        update: {},
      });
    }
  }

  revalidatePath(`/dashboard/surveys/${surveyId}/responses`);
}

export async function importTapInCsv(surveyId: string, csvText: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true },
  });
  if (!survey) throw new Error("Survey not found");

  const lines = csvText.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
  const emailIdx = header.findIndex((h) => h === "email");
  const tappedAtIdx = header.findIndex((h) => h === "tapped_at" || h === "tappedat" || h === "timestamp");
  const tapIdIdx = header.findIndex((h) => h === "id" || h === "tap_id" || h === "tapid");

  if (emailIdx === -1) throw new Error("CSV must have an 'email' column");
  if (tappedAtIdx === -1) throw new Error("CSV must have a 'tapped_at' or 'timestamp' column");

  // Find matching sessions by email
  const sessions = await db.surveySession.findMany({
    where: { surveyId, status: "COMPLETED", participantEmail: { not: null } },
    select: { id: true, participantEmail: true, startedAt: true, completedAt: true },
  });

  const sessionsByEmail = new Map<string, typeof sessions>();
  for (const s of sessions) {
    if (!s.participantEmail) continue;
    const key = s.participantEmail.toLowerCase();
    if (!sessionsByEmail.has(key)) sessionsByEmail.set(key, []);
    sessionsByEmail.get(key)!.push(s);
  }

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const email = cols[emailIdx]?.toLowerCase();
    const tappedAtStr = cols[tappedAtIdx];
    const tapId = tapIdIdx >= 0 ? cols[tapIdIdx] : `csv-${i}`;

    if (!email || !tappedAtStr) continue;

    const tappedAt = new Date(tappedAtStr);
    if (isNaN(tappedAt.getTime())) continue;

    const matchingSessions = sessionsByEmail.get(email);
    if (!matchingSessions) continue;

    // Match tap to the session whose time window contains the tap
    for (const s of matchingSessions) {
      if (!s.completedAt) continue;
      if (tappedAt >= s.startedAt && tappedAt <= s.completedAt) {
        await db.tapInTap.upsert({
          where: { sessionId_tapinId: { sessionId: s.id, tapinId: tapId } },
          create: { sessionId: s.id, tapinId: tapId, email, tappedAt },
          update: {},
        });
        imported++;
        break;
      }
    }
  }

  revalidatePath(`/dashboard/surveys/${surveyId}/responses`);
  return { imported };
}

export async function closeSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id, status: "LIVE" },
    data: { status: "CLOSED" },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
  revalidatePath("/dashboard");
}

export async function reopenSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id, status: "CLOSED" },
    data: { status: "LIVE" },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
  revalidatePath("/dashboard");
}
