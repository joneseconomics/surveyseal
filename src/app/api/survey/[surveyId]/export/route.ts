import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getAccessLevel } from "@/lib/access";
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

  const access = await getAccessLevel(surveyId, session.user.id);
  if (!access) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    select: { id: true, type: true },
  });

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  if (survey.type === "COMPARATIVE_JUDGMENT") {
    const format = req.nextUrl.searchParams.get("format");
    return format === "comparisons"
      ? exportCJComparisons(surveyId)
      : exportCJRankings(surveyId);
  }

  return exportQuestionnaire(surveyId);
}

async function exportCJRankings(surveyId: string) {
  const items = await db.cJItem.findMany({
    where: { surveyId },
    orderBy: { mu: "desc" },
  });

  const headers = ["rank", "label", "rating", "uncertainty", "comparison_count"];
  const rows = items.map((item, i) => {
    const values = [
      String(i + 1),
      item.label,
      String(Math.round(item.mu)),
      String(Math.round(Math.sqrt(item.sigmaSq))),
      String(item.comparisonCount),
    ];
    return values.map(escapeCsvField).join(",");
  });

  const csv = [headers.map(escapeCsvField).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="surveyseal-${surveyId}-rankings.csv"`,
    },
  });
}

async function exportCJComparisons(surveyId: string) {
  const comparisons = await db.comparison.findMany({
    where: {
      session: { surveyId },
      winnerId: { not: null },
    },
    include: {
      session: {
        select: {
          id: true,
          participantEmail: true,
          verificationStatus: true,
          botScore: true,
          judgeDemographics: true,
          isAiGenerated: true,
          aiPersona: true,
          aiProvider: true,
          aiModel: true,
        },
      },
      leftItem: { select: { label: true } },
      rightItem: { select: { label: true } },
      winner: { select: { label: true } },
    },
    orderBy: { judgedAt: "asc" },
  });

  const headers = [
    "session_id",
    "participant_email",
    "judge_title",
    "judge_employer",
    "judge_city",
    "judge_state",
    "has_hiring_experience",
    "hiring_roles",
    "left_item",
    "right_item",
    "winner",
    "judged_at",
    "verification_status",
    "bot_score",
    "is_ai_generated",
    "ai_persona",
    "ai_provider",
    "ai_model",
  ];

  const rows = comparisons.map((c) => {
    const demo = (c.session.judgeDemographics as Record<string, unknown>) ?? {};
    const values = [
      c.session.id,
      c.session.participantEmail ?? "",
      (demo.jobTitle as string) ?? "",
      (demo.employer as string) ?? "",
      (demo.city as string) ?? "",
      (demo.state as string) ?? "",
      demo.hasHiringExperience === true ? "true" : demo.hasHiringExperience === false ? "false" : "",
      Array.isArray(demo.hiringRoles) ? (demo.hiringRoles as string[]).join(";") : "",
      c.leftItem.label,
      c.rightItem.label,
      c.winner?.label ?? "",
      c.judgedAt?.toISOString() ?? "",
      c.session.verificationStatus,
      c.session.botScore !== null ? String(c.session.botScore) : "",
      c.session.isAiGenerated ? "true" : "false",
      c.session.aiPersona ?? "",
      c.session.aiProvider ?? "",
      c.session.aiModel ?? "",
    ];
    return values.map(escapeCsvField).join(",");
  });

  const csv = [headers.map(escapeCsvField).join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="surveyseal-${surveyId}-comparisons.csv"`,
    },
  });
}

async function exportQuestionnaire(surveyId: string) {
  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: { orderBy: { position: "asc" } },
      sessions: {
        where: { status: "COMPLETED" },
        include: {
          responses: true,
          verificationPoints: { orderBy: { createdAt: "asc" } },
          tapinTaps: { orderBy: { tappedAt: "asc" } },
        },
      },
    },
  });

  if (!survey) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const nonVPQuestions = survey.questions.filter((q) => !q.isVerificationPoint);
  const vpQuestions = survey.questions.filter((q) => q.isVerificationPoint);
  const vpCount = vpQuestions.length;

  const headers = [
    "session_id",
    "participant_email",
    "verification_status",
    "status",
    "started_at",
    "completed_at",
    ...nonVPQuestions.map(
      (q, i) => `q${i + 1}_${(q.content as { text?: string })?.text?.slice(0, 40) ?? "question"}`
    ),
    ...Array.from({ length: vpCount }, (_, i) => [
      `verification_point_${i + 1}_verified`,
      `verification_point_${i + 1}_skipped`,
      `verification_point_${i + 1}_email`,
    ]).flat(),
    "tapin_tap_count",
    "tapin_tap_timestamps",
    "bot_score",
    "bot_risk",
    "is_ai_generated",
    "ai_persona",
    "ai_provider",
    "ai_model",
  ];

  const rows = survey.sessions.map((s) => {
    const responseMap = new Map(s.responses.map((r) => [r.questionId, r.answer]));
    const vpsByPosition = s.verificationPoints.sort((a, b) => {
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
      ...nonVPQuestions.map((q) => {
        const answer = responseMap.get(q.id);
        if (answer === undefined || answer === null) return "";
        return typeof answer === "object" ? JSON.stringify(answer) : String(answer);
      }),
      ...Array.from({ length: vpCount }, (_, i) => {
        const cp = vpsByPosition[i];
        return [
          cp?.verified ? "true" : "false",
          cp?.skipped ? "true" : "false",
          cp?.verifiedEmail ?? "",
        ];
      }).flat(),
      String(s.tapinTaps.length),
      s.tapinTaps.map((t) => t.tappedAt.toISOString()).join(";"),
      s.botScore !== null ? String(s.botScore) : "",
      s.botScore !== null
        ? s.botScore < 0.3 ? "low" : s.botScore < 0.6 ? "medium" : "high"
        : "",
      s.isAiGenerated ? "true" : "false",
      s.aiPersona ?? "",
      s.aiProvider ?? "",
      s.aiModel ?? "",
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
