import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { fetchCourses } from "@/lib/canvas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const surveyId = req.nextUrl.searchParams.get("surveyId");
    if (!surveyId) {
      return NextResponse.json({ error: "surveyId is required" }, { status: 400 });
    }

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

    const courses = await fetchCourses(survey.canvasBaseUrl, survey.canvasApiToken);

    return NextResponse.json({
      courses: courses.map((c) => ({
        id: c.id,
        name: c.name,
        courseCode: c.course_code,
      })),
    });
  } catch (error) {
    console.error("[Canvas Courses]", error);
    const message = error instanceof Error ? error.message : "Failed to fetch courses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
