import { auth } from "@/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ surveyId: string }> }
) {
  const { surveyId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const survey = await db.survey.findUnique({
    where: { id: surveyId, ownerId: session.user.id },
    include: {
      questions: { orderBy: { position: "asc" } },
      sessions: {
        where: { status: "COMPLETED" },
        include: {
          responses: true,
          checkpoints: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const nonCheckpointQuestions = survey.questions.filter((q) => !q.isCheckpoint);

  // Build CSV header
  const headers = [
    "session_id",
    "participant_email",
    "verification_status",
    "status",
    "started_at",
    "completed_at",
    ...nonCheckpointQuestions.map(
      (q) => `q${q.position + 1}_${(q.content as { text?: string })?.text?.slice(0, 40) ?? "question"}`
    ),
    "checkpoint_1_verified",
    "checkpoint_1_skipped",
    "checkpoint_1_email",
    "checkpoint_2_verified",
    "checkpoint_2_skipped",
    "checkpoint_2_email",
    "checkpoint_3_verified",
    "checkpoint_3_skipped",
    "checkpoint_3_email",
  ];

  const rows = survey.sessions.map((s) => {
    const responseMap = new Map(s.responses.map((r) => [r.questionId, r.answer]));
    const checkpointsByPosition = s.checkpoints.sort((a, b) => {
      const posA = survey.questions.find((q) => q.id === a.questionId)?.position ?? 0;
      const posB = survey.questions.find((q) => q.id === b.questionId)?.position ?? 0;
      return posA - posB;
    });

    const values = [
      s.id,
      s.participantEmail ?? "",
      s.verificationStatus,
      s.status,
      s.startedAt.toISOString(),
      s.completedAt?.toISOString() ?? "",
      ...nonCheckpointQuestions.map((q) => {
        const answer = responseMap.get(q.id);
        if (answer === undefined || answer === null) return "";
        return typeof answer === "object" ? JSON.stringify(answer) : String(answer);
      }),
      ...Array.from({ length: 3 }, (_, i) => {
        const cp = checkpointsByPosition[i];
        return [
          cp?.verified ? "true" : "false",
          cp?.skipped ? "true" : "false",
          cp?.verifiedEmail ?? "",
        ];
      }).flat(),
    ];

    return values.map(escapeCsvField).join(",");
  });

  const csv = [headers.map(escapeCsvField).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="surveyseal-${surveyId}-export.csv"`,
    },
  });
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
