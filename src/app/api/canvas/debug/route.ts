import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const surveyId = req.nextUrl.searchParams.get("surveyId");
  if (!surveyId) {
    return NextResponse.json({ error: "surveyId required" }, { status: 400 });
  }

  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    select: { id: true, title: true },
  });
  if (!survey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const items = await db.cJItem.findMany({
    where: { surveyId },
    orderBy: { position: "asc" },
    select: { id: true, label: true, content: true, position: true },
  });

  return NextResponse.json({
    survey: survey.title,
    itemCount: items.length,
    items: items.map((item) => ({
      position: item.position,
      label: item.label,
      content: item.content,
    })),
  });
}
