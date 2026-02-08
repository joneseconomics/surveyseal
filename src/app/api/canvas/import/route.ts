import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { fetchSubmissions, downloadFile } from "@/lib/canvas";
import { getServerSupabase, BUCKET, getCJFilePath, getPublicUrl } from "@/lib/supabase";
import { z } from "zod";

const requestSchema = z.object({
  surveyId: z.string(),
  courseId: z.number(),
  assignmentId: z.number(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { surveyId, courseId, assignmentId } = requestSchema.parse(body);

    const survey = await db.survey.findUnique({
      where: { id: surveyId, ownerId: session.user.id },
      select: { canvasBaseUrl: true, canvasApiToken: true },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (!survey.canvasBaseUrl || !survey.canvasApiToken) {
      return NextResponse.json({ error: "Canvas credentials not configured" }, { status: 400 });
    }

    // Get current max position
    const lastItem = await db.cJItem.findFirst({
      where: { surveyId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    let nextPosition = (lastItem?.position ?? -1) + 1;

    const submissions = await fetchSubmissions(
      survey.canvasBaseUrl,
      survey.canvasApiToken,
      courseId,
      assignmentId,
    );

    const supabase = getServerSupabase();
    let imported = 0;
    let skipped = 0;

    for (const sub of submissions) {
      // Skip unsubmitted
      if (sub.workflow_state === "unsubmitted" || !sub.submitted_at) {
        skipped++;
        continue;
      }

      const studentName = sub.user?.name ?? "Unknown";
      const studentEmail = sub.user?.email ?? sub.user?.login_id ?? "";

      const baseContent = {
        sourceType: "canvas" as const,
        studentName,
        studentEmail,
        canvasUserId: sub.user_id,
        canvasSubmissionId: sub.id,
      };

      const content: Record<string, unknown> = { ...baseContent };

      if (sub.submission_type === "online_text_entry" && sub.body) {
        content.text = sub.body;
      } else if (sub.submission_type === "online_url" && sub.url) {
        content.submissionUrl = sub.url;
      } else if (
        sub.submission_type === "online_upload" &&
        sub.attachments &&
        sub.attachments.length > 0
      ) {
        // Upload first attachment to Supabase
        const attachment = sub.attachments[0];
        const contentType = attachment["content-type"] ?? inferMimeType(attachment.filename);
        try {
          const fileBuffer = await downloadFile(
            survey.canvasApiToken,
            attachment.url,
          );
          const fileId = `canvas-${sub.id}-${attachment.id}`;
          const filePath = getCJFilePath(surveyId, fileId, attachment.filename);

          await supabase.storage.from(BUCKET).upload(filePath, fileBuffer, {
            contentType,
            upsert: true,
          });

          const fileUrl = getPublicUrl(filePath);
          content.fileUrl = fileUrl;
          content.filePath = filePath;
          content.fileType = contentType;
          content.fileName = attachment.display_name;
        } catch (err) {
          console.error(`Failed to upload file for submission ${sub.id}:`, err);
          skipped++;
          continue;
        }
      } else {
        // No recognizable content
        skipped++;
        continue;
      }

      await db.cJItem.create({
        data: {
          surveyId,
          label: `Submission ${nextPosition + 1}`,
          content: content as unknown as Prisma.InputJsonValue,
          position: nextPosition,
        },
      });

      nextPosition++;
      imported++;
    }

    return NextResponse.json({ imported, skipped });
  } catch (error) {
    console.error("[Canvas Import]", error);
    const message = error instanceof Error ? error.message : "Import failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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
