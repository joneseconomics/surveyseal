"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  addQuestionSchema,
  updateQuestionSchema,
  questionContentSchemas,
  type QuestionTypeValue,
} from "@/lib/validations/survey";
import type { Prisma } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

async function verifyOwnership(surveyId: string, userId: string) {
  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: userId },
    select: { id: true, status: true },
  });
  if (!survey) throw new Error("Survey not found");
  if (survey.status !== "DRAFT") throw new Error("Cannot modify a published survey");
  return survey;
}

export async function addQuestion(data: {
  surveyId: string;
  type: QuestionTypeValue;
  content: Record<string, unknown>;
  isCheckpoint?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = addQuestionSchema.parse(data);
  const contentSchema = questionContentSchemas[parsed.type];
  contentSchema.parse(parsed.content);

  await verifyOwnership(parsed.surveyId, session.user.id);

  // Get next position
  const lastQuestion = await db.question.findFirst({
    where: { surveyId: parsed.surveyId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const position = (lastQuestion?.position ?? -1) + 1;

  await db.question.create({
    data: {
      surveyId: parsed.surveyId,
      position,
      type: parsed.type,
      content: parsed.content as unknown as Prisma.InputJsonValue,
      isCheckpoint: parsed.isCheckpoint ?? false,
    },
  });

  revalidatePath(`/dashboard/surveys/${parsed.surveyId}`);
}

export async function updateQuestion(data: {
  id: string;
  type: QuestionTypeValue;
  content: Record<string, unknown>;
  isCheckpoint?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = updateQuestionSchema.parse(data);
  const contentSchema = questionContentSchemas[parsed.type];
  contentSchema.parse(parsed.content);

  const question = await db.question.findUnique({
    where: { id: parsed.id },
    select: { surveyId: true },
  });
  if (!question) throw new Error("Question not found");

  await verifyOwnership(question.surveyId, session.user.id);

  await db.question.update({
    where: { id: parsed.id },
    data: {
      type: parsed.type,
      content: parsed.content as unknown as Prisma.InputJsonValue,
      isCheckpoint: parsed.isCheckpoint,
    },
  });

  revalidatePath(`/dashboard/surveys/${question.surveyId}`);
}

export async function deleteQuestion(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { surveyId: true, position: true },
  });
  if (!question) throw new Error("Question not found");

  await verifyOwnership(question.surveyId, session.user.id);

  // Delete and reorder remaining questions
  await db.$transaction([
    db.question.delete({ where: { id: questionId } }),
    db.question.updateMany({
      where: {
        surveyId: question.surveyId,
        position: { gt: question.position },
      },
      data: { position: { decrement: 1 } },
    }),
  ]);

  revalidatePath(`/dashboard/surveys/${question.surveyId}`);
}

export async function reorderQuestion(questionId: string, direction: "up" | "down") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { surveyId: true, position: true },
  });
  if (!question) throw new Error("Question not found");

  await verifyOwnership(question.surveyId, session.user.id);

  const swapPosition = direction === "up" ? question.position - 1 : question.position + 1;
  if (swapPosition < 0) return;

  const swapQuestion = await db.question.findUnique({
    where: {
      surveyId_position: {
        surveyId: question.surveyId,
        position: swapPosition,
      },
    },
    select: { id: true },
  });
  if (!swapQuestion) return;

  // Use a temporary position to avoid unique constraint violation
  const tempPosition = -1;
  await db.$transaction([
    db.question.update({
      where: { id: questionId },
      data: { position: tempPosition },
    }),
    db.question.update({
      where: { id: swapQuestion.id },
      data: { position: question.position },
    }),
    db.question.update({
      where: { id: questionId },
      data: { position: swapPosition },
    }),
  ]);

  revalidatePath(`/dashboard/surveys/${question.surveyId}`);
}

export async function toggleCheckpoint(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { surveyId: true, isCheckpoint: true },
  });
  if (!question) throw new Error("Question not found");

  await verifyOwnership(question.surveyId, session.user.id);

  await db.question.update({
    where: { id: questionId },
    data: { isCheckpoint: !question.isCheckpoint },
  });

  revalidatePath(`/dashboard/surveys/${question.surveyId}`);
}
