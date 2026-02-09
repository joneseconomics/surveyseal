"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createSurveySchema, updateSurveySchema, updateSurveySettingsSchema, updateCanvasSettingsSchema } from "@/lib/validations/survey";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fetchTapInTaps } from "@/lib/tapin";
import { getServerSupabase, BUCKET } from "@/lib/supabase";

export async function createSurvey(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createSurveySchema.parse({
    title: formData.get("title"),
    type: formData.get("type") || "QUESTIONNAIRE",
    cjSubtype: formData.get("cjSubtype") || undefined,
  });

  const isCJ = parsed.type === "COMPARATIVE_JUDGMENT";

  // Set default prompt and judge instructions based on CJ subtype
  let cjPrompt: string | undefined;
  let cjJudgeInstructions: string | undefined;
  if (isCJ) {
    switch (parsed.cjSubtype) {
      case "ASSIGNMENTS":
        cjPrompt = "Which of these two submissions demonstrates higher quality?";
        cjJudgeInstructions = "You will be comparing student submissions side by side. For each pair, carefully review both submissions and select the one you believe demonstrates higher quality.\n\nConsider the overall quality of each submission, including content, clarity, and thoroughness.";
        break;
      case "RESUMES":
        cjPrompt = "Which candidate would you advance to the next round of interviews?";
        cjJudgeInstructions = "You are a hiring manager for the position described below, and you will be shown two potential candidate r\u00e9sum\u00e9s to review. Please select the r\u00e9sum\u00e9 of the candidate whom you would advance to the next round of interviews. Please note that you can only select one of the r\u00e9sum\u00e9s.";
        break;
      default:
        cjPrompt = "Which of these two do you prefer?";
        cjJudgeInstructions = "You will be shown pairs of items side by side. For each pair, carefully review both items and select the one you believe is better.\n\nTake your time with each comparison — there are no right or wrong answers.";
    }
  }

  const survey = await db.survey.create({
    data: {
      title: parsed.title,
      type: parsed.type,
      ownerId: session.user.id,
      requireLogin: true,
      authProviders: ["google"],
      cjSubtype: isCJ ? (parsed.cjSubtype ?? "GENERIC") : null,
      cjPrompt,
      cjJudgeInstructions,
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

  // Delete all files in the survey's storage prefix
  try {
    const supabase = getServerSupabase();
    const { data: files } = await supabase.storage
      .from(BUCKET)
      .list(surveyId);
    if (files && files.length > 0) {
      const paths = files.map((f) => `${surveyId}/${f.name}`);
      await supabase.storage.from(BUCKET).remove(paths);
    }
  } catch (err) {
    console.error("Failed to clean up survey files from storage:", err);
  }

  await db.survey.delete({
    where: { id: surveyId, ownerId: session.user.id },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function publishSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    include: {
      questions: { orderBy: { position: "asc" } },
      cjItems: true,
    },
  });

  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") throw new Error("Survey is not in draft state");

  const verificationPoints = survey.questions.filter((q) => q.isVerificationPoint);

  if (survey.type !== "COMPARATIVE_JUDGMENT" && verificationPoints.length < 2) {
    throw new Error(
      `Surveys need at least 2 verification points to publish (found ${verificationPoints.length})`
    );
  }

  if (survey.type === "COMPARATIVE_JUDGMENT") {
    if (survey.cjItems.length < 3) {
      throw new Error(
        `Comparative Judgment surveys need at least 3 items to publish (found ${survey.cjItems.length})`
      );
    }
    // If no custom prompt is set, use the default
    if (!survey.cjPrompt) {
      await db.survey.update({
        where: { id: surveyId },
        data: { cjPrompt: "Which of these two do you prefer?" },
      });
    }
  } else {
    const lastQuestion = survey.questions[survey.questions.length - 1];
    const closingVP = verificationPoints[verificationPoints.length - 1];
    if (lastQuestion.id !== closingVP.id) {
      throw new Error(
        "The closing verification point must be the last item in the survey. No questions can come after it."
      );
    }
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

export async function updateAuthProviders(surveyId: string, providers: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id },
    data: { authProviders: providers },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
}

export async function updateSurveyTitle(surveyId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id },
    data: { title },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function updateCJResumeConfig(surveyId: string, jobTitle: string, jobUrl: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id },
    data: { cjJobTitle: jobTitle || null, cjJobUrl: jobUrl || null },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
}

export async function updateCJAssignmentInstructions(surveyId: string, instructions: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id },
    data: { cjAssignmentInstructions: instructions || null },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function updateCJJudgeInstructions(surveyId: string, instructions: string, jobUrl: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id },
    data: {
      cjJudgeInstructions: instructions || null,
      cjJobUrl: jobUrl || null,
    },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function updateRespondentAuth(surveyId: string, requireLogin: boolean, authProviders: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.survey.update({
    where: { id: surveyId, ownerId: session.user.id },
    data: { requireLogin, authProviders },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
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

export async function updateCanvasSettings(data: {
  surveyId: string;
  canvasBaseUrl: string;
  canvasApiToken: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = updateCanvasSettingsSchema.parse(data);

  await db.survey.update({
    where: { id: parsed.surveyId, ownerId: session.user.id },
    data: {
      canvasBaseUrl: parsed.canvasBaseUrl,
      canvasApiToken: parsed.canvasApiToken,
    },
  });

  revalidatePath(`/dashboard/surveys/${parsed.surveyId}/settings`);
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
