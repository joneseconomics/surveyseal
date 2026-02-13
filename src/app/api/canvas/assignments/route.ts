import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessLevel } from "@/lib/access";
import { fetchAssignments } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const surveyId = req.nextUrl.searchParams.get("surveyId");
    const courseId = req.nextUrl.searchParams.get("courseId");

    if (!surveyId || !courseId) {
      return NextResponse.json({ error: "surveyId and courseId are required" }, { status: 400 });
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

    const assignments = await fetchAssignments(
      survey.canvasBaseUrl,
      survey.canvasApiToken,
      parseInt(courseId, 10),
    );

    return NextResponse.json({
      assignments: assignments.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description,
        dueAt: a.due_at,
        isGroup: !!a.group_category_id,
        submissionTypes: a.submission_types,
        hasSubmissions: a.has_submitted_submissions,
      })),
    });
  } catch (error) {
    console.error("[Canvas Assignments]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
