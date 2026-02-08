import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { getServerSupabase, BUCKET } from "@/lib/supabase";

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".txt": "text/plain",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function inferMimeType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return MIME_MAP[ext] ?? "application/octet-stream";
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { surveyId } = await req.json();
    if (!surveyId) {
      return NextResponse.json({ error: "surveyId required" }, { status: 400 });
    }

    const survey = await db.survey.findUnique({
      where: { id: surveyId, ownerId: session.user.id },
      select: { id: true },
    });
    if (!survey) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const items = await db.cJItem.findMany({
      where: { surveyId },
      select: { id: true, content: true },
    });

    const supabase = getServerSupabase();
    let repaired = 0;

    for (const item of items) {
      const content = item.content as Record<string, unknown> | null;
      if (!content) continue;
      if (content.sourceType !== "canvas") continue;
      if (!content.filePath || !content.fileName) continue;
      if (content.fileType) continue; // already has fileType, skip

      const filePath = content.filePath as string;
      const fileName = content.fileName as string;
      const correctType = inferMimeType(fileName);

      // Download from Supabase and re-upload with correct content-type
      const { data: fileData, error: dlError } = await supabase.storage
        .from(BUCKET)
        .download(filePath);

      if (dlError || !fileData) {
        console.error(`Failed to download ${filePath}:`, dlError);
        continue;
      }

      const buffer = Buffer.from(await fileData.arrayBuffer());

      const { error: upError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, buffer, {
          contentType: correctType,
          upsert: true,
        });

      if (upError) {
        console.error(`Failed to re-upload ${filePath}:`, upError);
        continue;
      }

      // Update content JSON with fileType
      await db.cJItem.update({
        where: { id: item.id },
        data: {
          content: {
            ...content,
            fileType: correctType,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      repaired++;
    }

    return NextResponse.json({ repaired, total: items.length });
  } catch (error) {
    console.error("[Canvas Repair]", error);
    const message = error instanceof Error ? error.message : "Repair failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
