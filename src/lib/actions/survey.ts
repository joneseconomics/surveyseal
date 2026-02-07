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
            { position: 0, type: "FREE_TEXT", content: { text: "Opening Checkpoint" }, isCheckpoint: true },
            { position: 1, type: "FREE_TEXT", content: { text: "Mid-Survey Checkpoint" }, isCheckpoint: true },
            { position: 2, type: "FREE_TEXT", content: { text: "Closing Checkpoint" }, isCheckpoint: true },
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

  // Validate that survey has exactly 3 checkpoints and the closing one is last
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

  const checkpoints = survey.questions.filter((q) => q.isCheckpoint);
  if (checkpoints.length !== 3) {
    throw new Error(
      `Survey must have exactly 3 checkpoints to publish (found ${checkpoints.length})`
    );
  }

  const lastQuestion = survey.questions[survey.questions.length - 1];
  const closingCheckpoint = checkpoints[checkpoints.length - 1];
  if (lastQuestion.id !== closingCheckpoint.id) {
    throw new Error(
      "The closing checkpoint must be the last question in the survey. No questions can come after it."
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
    checkpointTimerSeconds: formData.get("checkpointTimerSeconds"),
    tapinApiKey: formData.get("tapinApiKey") || undefined,
    tapinCampaignId: formData.get("tapinCampaignId") || undefined,
  });

  await db.survey.update({
    where: { id: parsed.id, ownerId: session.user.id },
    data: {
      checkpointTimerSeconds: parsed.checkpointTimerSeconds,
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
      checkpointTimerSeconds: true,
    },
  });

  if (!survey) throw new Error("Survey not found");
  if (!survey.tapinApiKey || !survey.tapinCampaignId) {
    throw new Error("TapIn API key and campaign ID must be configured in Settings");
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
    const to = new Date(s.completedAt.getTime() + survey.checkpointTimerSeconds * 1000);

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
