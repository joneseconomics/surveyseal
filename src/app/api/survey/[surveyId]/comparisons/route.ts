import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { surveyId } = await params;
  await requireAccess(surveyId, session.user.id, "viewer");

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const comparisons = await db.comparison.findMany({
    where: {
      sessionId,
      session: { surveyId },
      winnerId: { not: null },
    },
    orderBy: { position: "asc" },
    select: {
      leftItem: { select: { label: true } },
      rightItem: { select: { label: true } },
      winner: { select: { id: true } },
      leftItemId: true,
      rightItemId: true,
    },
  });

  return NextResponse.json(
    comparisons.map((c) => ({
      winner: c.winner!.id === c.leftItemId ? c.leftItem.label : c.rightItem.label,
      loser: c.winner!.id === c.leftItemId ? c.rightItem.label : c.leftItem.label,
    })),
  );
}
