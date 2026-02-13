import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessLevel } from "@/lib/access";
import { fetchSubmissions } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const surveyId = req.nextUrl.searchParams.get("surveyId");
    const courseId = req.nextUrl.searchParams.get("courseId");
    const assignmentId = req.nextUrl.searchParams.get("assignmentId");

    if (!surveyId || !courseId || !assignmentId) {
      return NextResponse.json(
        { error: "surveyId, courseId, and assignmentId are required" },
        { status: 400 },
      );
    }

    const access = await getAccessLevel(surveyId, session.user.id);
    if (!access || access === "viewer") {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    const survey = await db.survey.findUnique({
      where: { id: surveyId },
      select: { canvasBaseUrl: true, canvasApiToken: true },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (!survey.canvasBaseUrl || !survey.canvasApiToken) {
      return NextResponse.json({ error: "Canvas credentials not configured" }, { status: 400 });
    }

    const submissions = await fetchSubmissions(
      survey.canvasBaseUrl,
      survey.canvasApiToken,
      parseInt(courseId, 10),
      parseInt(assignmentId, 10),
    );

    const mapped = submissions
      .filter((s) => s.workflow_state !== "unsubmitted" && s.submitted_at)
      .map((s) => ({
        id: s.id,
        userId: s.user_id,
        userName: s.user?.name ?? "Unknown",
        userEmail: s.user?.email ?? s.user?.login_id ?? "",
        submissionType: s.submission_type,
        body: s.body,
        url: s.url,
        attachments: s.attachments?.map((a) => ({
          id: a.id,
          displayName: a.display_name,
          filename: a.filename,
          url: a.url,
          size: a.size,
          contentType: a["content-type"],
        })) ?? [],
      }));

    return NextResponse.json({ submissions: mapped });
  } catch (error) {
    console.error("[Canvas Submissions]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch submissions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
