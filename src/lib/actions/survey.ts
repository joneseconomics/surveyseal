"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createSurveySchema, updateSurveySchema } from "@/lib/validations/survey";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSurvey(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = createSurveySchema.parse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  });

  const survey = await db.survey.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      ownerId: session.user.id,
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

  // Validate that survey has exactly 3 checkpoints
  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    include: {
      questions: {
        where: { isCheckpoint: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") throw new Error("Survey is not in draft state");

  const checkpoints = survey.questions;
  if (checkpoints.length !== 3) {
    throw new Error(
      `Survey must have exactly 3 checkpoints to publish (found ${checkpoints.length})`
    );
  }

  await db.survey.update({
    where: { id: surveyId },
    data: { status: "LIVE" },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}`);
  revalidatePath("/dashboard");
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
