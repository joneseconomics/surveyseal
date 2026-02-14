import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const persona = await db.judgePersona.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (persona.createdById !== session.user.id) {
    return NextResponse.json(
      { error: "Only the creator can delete this persona" },
      { status: 403 },
    );
  }

  await db.judgePersona.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
