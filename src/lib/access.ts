import { db } from "@/lib/db";

export type AccessLevel = "owner" | "editor" | "viewer" | null;

export async function getAccessLevel(
  surveyId: string,
  userId: string,
): Promise<AccessLevel> {
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    select: { ownerId: true },
  });

  if (!survey) return null;
  if (survey.ownerId === userId) return "owner";

  const collab = await db.surveyCollaborator.findFirst({
    where: {
      surveyId,
      userId,
      acceptedAt: { not: null },
    },
    select: { role: true },
  });

  if (!collab) return null;
  return collab.role === "EDITOR" ? "editor" : "viewer";
}

const LEVEL_ORDER: Record<string, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

export async function requireAccess(
  surveyId: string,
  userId: string,
  minRole: "viewer" | "editor" | "owner",
): Promise<AccessLevel> {
  const level = await getAccessLevel(surveyId, userId);
  if (!level || LEVEL_ORDER[level] < LEVEL_ORDER[minRole]) {
    throw new Error("Survey not found");
  }
  return level;
}
