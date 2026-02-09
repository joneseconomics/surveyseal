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
  isVerificationPoint?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const parsed = addQuestionSchema.parse(data);
  const contentSchema = questionContentSchemas[parsed.type];
  contentSchema.parse(parsed.content);

  await verifyOwnership(parsed.surveyId, session.user.id);

  const isVP = parsed.isVerificationPoint ?? false;

  // Find the last question and the closing VP (last VP by position)
  const allQuestions = await db.question.findMany({
    where: { surveyId: parsed.surveyId },
    orderBy: { position: "asc" },
    select: { id: true, position: true, isVerificationPoint: true },
  });

  const vps = allQuestions.filter((q) => q.isVerificationPoint);
  const closingVP = vps.length >= 2 ? vps[vps.length - 1] : null;
  const lastPosition = allQuestions.length > 0
    ? allQuestions[allQuestions.length - 1].position
    : -1;

  // If adding a regular question and there's a closing VP at the end,
  // insert before the closing VP and bump it
  if (!isVP && closingVP && closingVP.position === lastPosition) {
    await db.$transaction([
      db.question.update({
        where: { id: closingVP.id },
        data: { position: -(closingVP.position + 2) }, // temp negative
      }),
      db.question.create({
        data: {
          surveyId: parsed.surveyId,
          position: closingVP.position,
          type: parsed.type,
          content: parsed.content as unknown as Prisma.InputJsonValue,
          isVerificationPoint: false,
        },
      }),
      db.question.update({
        where: { id: closingVP.id },
        data: { position: closingVP.position + 1 },
      }),
    ]);
  } else {
    await db.question.create({
      data: {
        surveyId: parsed.surveyId,
        position: lastPosition + 1,
        type: parsed.type,
        content: parsed.content as unknown as Prisma.InputJsonValue,
        isVerificationPoint: isVP,
      },
    });
  }

  revalidatePath(`/dashboard/surveys/${parsed.surveyId}`);
}

export async function updateQuestion(data: {
  id: string;
  type: QuestionTypeValue;
  content: Record<string, unknown>;
  isVerificationPoint?: boolean;
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
      isVerificationPoint: parsed.isVerificationPoint,
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

export async function reorderQuestions(surveyId: string, orderedIds: string[]) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await verifyOwnership(surveyId, session.user.id);

  // Fetch all questions ordered by current position
  const allQuestions = await db.question.findMany({
    where: { surveyId },
    orderBy: { position: "asc" },
    select: { id: true },
  });

  let finalOrder: string[];

  if (orderedIds.length === allQuestions.length) {
    // Full reorder — simple sequential assignment
    finalOrder = orderedIds;
  } else {
    // Subset reorder (e.g. only questions or only verification points).
    // Walk the current order, replacing items in the reorder set with the
    // new order while keeping other items in their original positions.
    const reorderSet = new Set(orderedIds);
    let reorderIndex = 0;
    finalOrder = allQuestions.map((q) => {
      if (reorderSet.has(q.id)) {
        return orderedIds[reorderIndex++];
      }
      return q.id;
    });
  }

  // Move all to negative temporary positions first to avoid unique constraint violations,
  // then assign final positions.
  await db.$transaction([
    ...finalOrder.map((id, i) =>
      db.question.update({ where: { id }, data: { position: -(i + 1) } })
    ),
    ...finalOrder.map((id, i) =>
      db.question.update({ where: { id }, data: { position: i } })
    ),
  ]);

  revalidatePath(`/dashboard/surveys/${surveyId}`);
}

export async function importQuestionsFromCSV(data: {
  surveyId: string;
  questions: Array<{ type: QuestionTypeValue; content: Record<string, unknown> }>;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await verifyOwnership(data.surveyId, session.user.id);

  if (data.questions.length === 0) throw new Error("No questions to import");

  // Validate each question's content against its schema
  for (const q of data.questions) {
    const contentSchema = questionContentSchemas[q.type];
    contentSchema.parse(q.content);
  }

  // Find existing questions to determine positions
  const allQuestions = await db.question.findMany({
    where: { surveyId: data.surveyId },
    orderBy: { position: "asc" },
    select: { id: true, position: true, isVerificationPoint: true },
  });

  const vps = allQuestions.filter((q) => q.isVerificationPoint);
  const closingVP = vps.length >= 2 ? vps[vps.length - 1] : null;
  const lastPosition = allQuestions.length > 0
    ? allQuestions[allQuestions.length - 1].position
    : -1;

  // If there's a closing VP at the end, insert before it and bump it
  if (closingVP && closingVP.position === lastPosition) {
    const insertPosition = closingVP.position;
    const newCount = data.questions.length;

    await db.$transaction([
      // Move closing VP to temp negative position
      db.question.update({
        where: { id: closingVP.id },
        data: { position: -(insertPosition + newCount + 1) },
      }),
      // Create imported questions at the insertion point
      db.question.createMany({
        data: data.questions.map((q, i) => ({
          surveyId: data.surveyId,
          position: insertPosition + i,
          type: q.type,
          content: q.content as unknown as Prisma.InputJsonValue,
          isVerificationPoint: false,
        })),
      }),
      // Move closing VP to after the imported questions
      db.question.update({
        where: { id: closingVP.id },
        data: { position: insertPosition + newCount },
      }),
    ]);
  } else {
    const startPosition = lastPosition + 1;
    await db.question.createMany({
      data: data.questions.map((q, i) => ({
        surveyId: data.surveyId,
        position: startPosition + i,
        type: q.type,
        content: q.content as unknown as Prisma.InputJsonValue,
        isVerificationPoint: false,
      })),
    });
  }

  revalidatePath(`/dashboard/surveys/${data.surveyId}`);
}

export async function toggleVerificationPoint(questionId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const question = await db.question.findUnique({
    where: { id: questionId },
    select: { surveyId: true, isVerificationPoint: true },
  });
  if (!question) throw new Error("Question not found");

  await verifyOwnership(question.surveyId, session.user.id);

  await db.question.update({
    where: { id: questionId },
    data: { isVerificationPoint: !question.isVerificationPoint },
  });

  revalidatePath(`/dashboard/surveys/${question.surveyId}`);
}

