"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import {
  addCJItemSchema,
  updateCJItemSchema,
  updateCJSettingsSchema,
} from "@/lib/validations/cj";
import type { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { getServerSupabase, BUCKET } from "@/lib/supabase";

async function verifyOwnership(surveyId: string, userId: string) {
  await requireAccess(surveyId, userId, "editor");
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, status: true },
  });
  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") throw new Error("Cannot modify a published survey");
  return survey;
}

export async function addCJItem(data: {
  surveyId: string;
  label: string;
  content: Record<string, unknown>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = addCJItemSchema.parse(data);
  await verifyOwnership(parsed.surveyId, session.user.id);

  const lastItem = await db.cJItem.findFirst({
    where: { surveyId: parsed.surveyId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = (lastItem?.position ?? -1) + 1;

  await db.cJItem.create({
    data: {
      surveyId: parsed.surveyId,
      label: parsed.label,
      content: parsed.content as unknown as Prisma.InputJsonValue,
      position,
    },
  });

  revalidatePath(`/dashboard/surveys/${parsed.surveyId}`);
}

export async function updateCJItem(data: {
  id: string;
  label: string;
  content: Record<string, unknown>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = updateCJItemSchema.parse(data);

  const item = await db.cJItem.findUnique({
    where: { id: parsed.id },
    select: { surveyId: true },
  });
  if (!item) throw new Error("Item not found");

  await verifyOwnership(item.surveyId, session.user.id);

  await db.cJItem.update({
    where: { id: parsed.id },
    data: {
      label: parsed.label,
      content: parsed.content as unknown as Prisma.InputJsonValue,
    },
  });

  revalidatePath(`/dashboard/surveys/${item.surveyId}`);
}

export async function deleteCJItem(itemId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const item = await db.cJItem.findUnique({
    where: { id: itemId },
    select: { surveyId: true, position: true, content: true },
  });
  if (!item) throw new Error("Item not found");

  await verifyOwnership(item.surveyId, session.user.id);

  // Delete file from Supabase Storage if present
  const content = item.content as Record<string, unknown> | null;
  if (content?.filePath && typeof content.filePath === "string") {
    try {
      const supabase = getServerSupabase();
      await supabase.storage.from(BUCKET).remove([content.filePath]);
    } catch (err) {
      console.error("Failed to delete file from storage:", err);
    }
  }

  await db.$transaction([
    db.cJItem.delete({ where: { id: itemId } }),
    db.cJItem.updateMany({
      where: {
        surveyId: item.surveyId,
        position: { gt: item.position },
      },
      data: { position: { decrement: 1 } },
    }),
  ]);

  revalidatePath(`/dashboard/surveys/${item.surveyId}`);
}

export async function reorderCJItems(surveyId: string, orderedIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await verifyOwnership(surveyId, session.user.id);

  await db.$transaction([
    ...orderedIds.map((id, i) =>
      db.cJItem.update({ where: { id }, data: { position: -(i + 1) } })
    ),
    ...orderedIds.map((id, i) =>
      db.cJItem.update({ where: { id }, data: { position: i } })
    ),
  ]);

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function updateCJSettings(data: {
  surveyId: string;
  cjPrompt: string;
  comparisonsPerJudge: number | null;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = updateCJSettingsSchema.parse(data);

  await requireAccess(parsed.surveyId, session.user.id, "editor");

  await db.survey.update({
    where: { id: parsed.surveyId },
    data: {
      cjPrompt: parsed.cjPrompt,
      comparisonsPerJudge: parsed.comparisonsPerJudge,
    },
  });

  revalidatePath(`/dashboard/surveys/${parsed.surveyId}`);
}

function getVPLabel(index: number, total: number): string {
  if (index === 0) return "Opening Verification Point";
  if (index === total - 1) return "Closing Verification Point";
  return `Verification Point ${index + 1}`;
}

export async function updateVerificationPointCount(surveyId: string, count: number) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  if (count < 0 || count > 10) throw new Error("VP count must be between 0 and 10");

  await verifyOwnership(surveyId, session.user.id);

  const existingVPs = await db.question.findMany({
    where: { surveyId, isVerificationPoint: true },
    orderBy: { position: "asc" },
  });

  const currentCount = existingVPs.length;

  // Delete all existing VPs and recreate with correct labels
  if (count !== currentCount) {
    if (currentCount > 0) {
      await db.question.deleteMany({
        where: { id: { in: existingVPs.map((vp) => vp.id) } },
      });
    }

    if (count > 0) {
      const lastQuestion = await db.question.findFirst({
        where: { surveyId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      const startPosition = (lastQuestion?.position ?? -1) + 1;

      await db.question.createMany({
        data: Array.from({ length: count }, (_, i) => ({
          surveyId,
          position: startPosition + i,
          type: "FREE_TEXT" as const,
          content: { text: getVPLabel(i, count) },
          isVerificationPoint: true,
        })),
      });
    }
  }

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}
