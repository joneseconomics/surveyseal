"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
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
        cjJudgeInstructions = "You are a hiring manager for the position described below, and you will be shown two potential candidate resumes to review. Please select the resume of the candidate whom you would advance to the next round of interviews. Please note that you can only select one of the resumes.";
        break;
      default:
        cjPrompt = "Which of these two do you prefer?";
        cjJudgeInstructions = "You will be shown pairs of items side by side. For each pair, carefully review both items and select the one you believe is better.";
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

  // Auto-create 2 default verification points (opening + closing)
  await db.question.createMany({
    data: [
      {
        surveyId: survey.id,
        position: 0,
        type: "FREE_TEXT",
        content: { text: "Opening Verification Point" },
        isVerificationPoint: true,
      },
      {
        surveyId: survey.id,
        position: 1,
        type: "FREE_TEXT",
        content: { text: "Closing Verification Point" },
        isVerificationPoint: true,
      },
    ],
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

  await requireAccess(parsed.id, session.user.id, "editor");

  await db.survey.update({
    where: { id: parsed.id },
    data: { title: parsed.title, description: parsed.description },
  });

  revalidatePath(`/dashboard/surveys/${parsed.id}`);
}

export async function deleteSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "owner");

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
    where: { id: surveyId },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function publishSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { position: "asc" } },
      cjItems: true,
    },
  });

  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") throw new Error("Survey is not in draft state");

  // Questionnaires can be published with or without VPs
  // (VPs are created by default but can be removed in settings)

  const verificationPoints = survey.questions.filter((q) => q.isVerificationPoint);
  const regularQuestions = survey.questions.filter((q) => !q.isVerificationPoint);

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
    if (regularQuestions.length < 1) {
      throw new Error("Surveys need at least 1 question to publish.");
    }
  }

  // Redistribute VPs: first at beginning, last at end, rest evenly spaced
  if (verificationPoints.length > 0 && regularQuestions.length > 0) {
    const vpIds = verificationPoints.map((vp) => vp.id);
    const regIds = regularQuestions.map((q) => q.id);

    // Build interleaved order
    const finalOrder: string[] = [];

    if (vpIds.length === 1) {
      // Single VP goes at the beginning
      finalOrder.push(vpIds[0], ...regIds);
    } else {
      // First VP at beginning, last VP at end, middle VPs evenly distributed
      const middleVPs = vpIds.slice(1, -1);
      const closingVP = vpIds[vpIds.length - 1];

      finalOrder.push(vpIds[0]); // Opening VP

      if (middleVPs.length > 0) {
        // Distribute middle VPs evenly among regular questions
        const chunkSize = Math.ceil(regIds.length / (middleVPs.length + 1));
        let regIndex = 0;
        for (let i = 0; i < middleVPs.length; i++) {
          const end = Math.min(regIndex + chunkSize, regIds.length);
          finalOrder.push(...regIds.slice(regIndex, end));
          finalOrder.push(middleVPs[i]);
          regIndex = end;
        }
        // Remaining regular questions
        finalOrder.push(...regIds.slice(regIndex));
      } else {
        finalOrder.push(...regIds);
      }

      finalOrder.push(closingVP); // Closing VP
    }

    // Update positions using negative temps to avoid unique constraint
    await db.$transaction([
      ...finalOrder.map((id, i) =>
        db.question.update({ where: { id }, data: { position: -(i + 1) } })
      ),
      ...finalOrder.map((id, i) =>
        db.question.update({ where: { id }, data: { position: i } })
      ),
    ]);
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

  await requireAccess(parsed.id, session.user.id, "editor");

  await db.survey.update({
    where: { id: parsed.id },
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

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId },
    data: { authProviders: providers },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
}

export async function updateSurveyTitle(surveyId: string, title: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId },
    data: { title },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function updateCJResumeConfig(surveyId: string, jobTitle: string, jobUrl: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId },
    data: { cjJobTitle: jobTitle || null, cjJobUrl: jobUrl || null },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
}

export async function updateCJAssignmentInstructions(surveyId: string, instructions: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId },
    data: { cjAssignmentInstructions: instructions || null },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function updateCJJudgeInstructions(
  surveyId: string,
  instructions: string,
  jobUrl: string,
  jobTitle?: string,
  jobDescFile?: { fileUrl: string | null; fileType: string | null; fileName: string | null; filePath: string | null },
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId },
    data: {
      cjJudgeInstructions: instructions || null,
      cjJobUrl: jobUrl || null,
      ...(jobTitle !== undefined && { cjJobTitle: jobTitle || null }),
      ...(jobDescFile !== undefined && {
        cjJobDescFileUrl: jobDescFile.fileUrl,
        cjJobDescFileType: jobDescFile.fileType,
        cjJobDescFileName: jobDescFile.fileName,
        cjJobDescFilePath: jobDescFile.filePath,
      }),
    },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function updateRespondentAuth(surveyId: string, requireLogin: boolean, authProviders: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId },
    data: { requireLogin, authProviders },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
}

export async function reconcileTapIn(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  const survey = await db.survey.findUnique({
    where: { id: surveyId },
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

  await requireAccess(surveyId, session.user.id, "editor");

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

  await requireAccess(parsed.surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: parsed.surveyId },
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

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId, status: "LIVE" },
    data: { status: "CLOSED" },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
  revalidatePath("/dashboard");
}

export async function copySurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "viewer");

  const source = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { position: "asc" } },
      cjItems: { orderBy: { position: "asc" } },
    },
  });

  if (!source) throw new Error("Survey not found");

  const copy = await db.survey.create({
    data: {
      title: `${source.title} (Copy)`,
      description: source.description,
      type: source.type,
      ownerId: session.user.id,
      requireLogin: source.requireLogin,
      authProviders: source.authProviders,
      verificationPointTimerSeconds: source.verificationPointTimerSeconds,
      cjSubtype: source.cjSubtype,
      cjPrompt: source.cjPrompt,
      cjJudgeInstructions: source.cjJudgeInstructions,
      cjJobTitle: source.cjJobTitle,
      cjJobUrl: source.cjJobUrl,
      cjJobDescFileUrl: source.cjJobDescFileUrl,
      cjJobDescFileType: source.cjJobDescFileType,
      cjJobDescFileName: source.cjJobDescFileName,
      cjJobDescFilePath: source.cjJobDescFilePath,
      cjAssignmentInstructions: source.cjAssignmentInstructions,
      comparisonsPerJudge: source.comparisonsPerJudge,
      tapinApiKey: source.tapinApiKey,
      tapinCampaignId: source.tapinCampaignId,
      canvasBaseUrl: source.canvasBaseUrl,
      canvasApiToken: source.canvasApiToken,
    },
  });

  // Copy questions
  if (source.questions.length > 0) {
    await db.question.createMany({
      data: source.questions.map((q) => ({
        surveyId: copy.id,
        position: q.position,
        type: q.type,
        content: q.content as object,
        isVerificationPoint: q.isVerificationPoint,
      })),
    });
  }

  // Copy CJ items (without ratings — start fresh)
  if (source.cjItems.length > 0) {
    await db.cJItem.createMany({
      data: source.cjItems.map((item) => ({
        surveyId: copy.id,
        label: item.label,
        content: item.content as object,
        position: item.position,
      })),
    });
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/surveys/${copy.id}`);
}

export async function reopenSurvey(surveyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: surveyId, status: "CLOSED" },
    data: { status: "LIVE" },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
  revalidatePath("/dashboard");
}
