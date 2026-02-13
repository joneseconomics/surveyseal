"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import { revalidatePath } from "next/cache";
import type { CollaboratorRole } from "@/generated/prisma/client";

export async function inviteCollaborator(
  surveyId: string,
  email: string,
  role: CollaboratorRole,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "owner");

  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail) throw new Error("Email is required");

  // Check if already invited
  const existing = await db.surveyCollaborator.findUnique({
    where: { surveyId_email: { surveyId, email: normalizedEmail } },
  });
  if (existing) throw new Error("This person has already been invited");

  // Check if inviting themselves
  const owner = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });
  if (owner?.email?.toLowerCase() === normalizedEmail) {
    throw new Error("You cannot invite yourself");
  }

  // Auto-link if user already exists
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  await db.surveyCollaborator.create({
    data: {
      surveyId,
      email: normalizedEmail,
      role,
      userId: existingUser?.id ?? null,
      acceptedAt: existingUser ? new Date() : null,
    },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
}

export async function removeCollaborator(
  surveyId: string,
  collaboratorId: string,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "owner");

  await db.surveyCollaborator.delete({
    where: { id: collaboratorId, surveyId },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
  revalidatePath("/dashboard");
}

export async function updateCollaboratorRole(
  surveyId: string,
  collaboratorId: string,
  role: CollaboratorRole,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireAccess(surveyId, session.user.id, "owner");

  await db.surveyCollaborator.update({
    where: { id: collaboratorId, surveyId },
    data: { role },
  });

  revalidatePath(`/dashboard/surveys/${surveyId}/settings`);
}
