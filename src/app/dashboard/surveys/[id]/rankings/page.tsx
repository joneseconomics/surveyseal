import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeReliability } from "@/lib/cj/reliability";
import { RankingsTable } from "@/components/dashboard/rankings-table";
import { JudgesTable } from "@/components/dashboard/judges-table";
import { ExportDataButtons } from "@/components/dashboard/export-data-buttons";

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  await requireAccess(id, session.user.id, "viewer");

  const survey = await db.survey.findUnique({
    where: { id },
    select: { type: true, comparisonsPerJudge: true },
  });

  if (!survey || survey.type !== "COMPARATIVE_JUDGMENT") notFound();

  const items = await db.cJItem.findMany({
    where: { surveyId: id },
    orderBy: { mu: "desc" },
  });

  const comparisons = await db.comparison.findMany({
    where: {
      session: { surveyId: id },
      winnerId: { not: null },
    },
    select: {
      leftItemId: true,
      rightItemId: true,
      winnerId: true,
    },
  });

  // Judge data: sessions with full comparison details
  const sessions = await db.surveySession.findMany({
    where: { surveyId: id },
    select: {
      id: true,
      participantEmail: true,
      isAiGenerated: true,
      aiPersona: true,
      judgeDemographics: true,
      status: true,
      verificationStatus: true,
      botScore: true,
      startedAt: true,
      completedAt: true,
      comparisons: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          leftItemId: true,
          rightItemId: true,
          winnerId: true,
          createdAt: true,
          judgedAt: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  const totalComparisons = comparisons.length;
  const reliability = computeReliability(
    items.map((i) => ({ id: i.id })),
    comparisons.map((c) => ({
      leftItemId: c.leftItemId,
      rightItemId: c.rightItemId,
      winnerId: c.winnerId!,
    }))
  );

  const reliabilityColor =
    reliability >= 0.9
      ? "bg-green-100 text-green-800"
      : reliability >= 0.7
        ? "bg-yellow-100 text-yellow-800"
        : "bg-red-100 text-red-800";

  const reliabilityLabel =
    reliability >= 0.9
      ? "Good"
      : reliability >= 0.7
        ? "Acceptable"
        : "Low";

  // Aggregate judge metrics
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
  const totalJudges = sessions.length;
  const completionRate = totalJudges > 0 ? completedSessions.length / totalJudges : 0;
  const comparisonsExpected = survey.comparisonsPerJudge ?? Math.max(items.length - 1, 1);

  // Median time per comparison across all judges
  const allDurations: number[] = [];
  for (const s of sessions) {
    for (const c of s.comparisons) {
      if (c.winnerId && c.judgedAt) {
        const d = new Date(c.judgedAt).getTime() - new Date(c.createdAt).getTime();
        if (d > 0 && d < 600_000) allDurations.push(d);
      }
    }
  }
  allDurations.sort((a, b) => a - b);
  const globalMedianMs = allDurations.length > 0
    ? allDurations[Math.floor(allDurations.length / 2)]
    : null;

  // Item map for judge table
  const itemMap: Record<string, { label: string; mu: number }> = {};
  for (const item of items) {
    itemMap[item.id] = { label: item.label, mu: item.mu };
  }

  // Rankings export data
  const hasCanvasItems = items.some(
    (item) => (item.content as { sourceType?: string } | null)?.sourceType === "canvas",
  );
  const rankingsExport = items.map((item, index) => {
    const content = item.content as { sourceType?: string; studentName?: string; studentEmail?: string } | null;
    return {
      rank: index + 1,
      label: item.label,
      rating: Math.round(item.mu),
      uncertainty: Math.round(Math.sqrt(item.sigmaSq)),
      comparisons: item.comparisonCount,
      studentName: content?.studentName,
      studentEmail: content?.studentEmail,
    };
  });

  // Judge metrics for export
  const judgesExport = sessions.map((s) => {
    const judged = s.comparisons.filter((c) => c.winnerId !== null && c.judgedAt);
    const durations = judged
      .map((c) => new Date(c.judgedAt!).getTime() - new Date(c.createdAt).getTime())
      .filter((d) => d > 0 && d < 600_000);
    durations.sort((a, b) => a - b);
    const medianMs = durations.length > 0 ? durations[Math.floor(durations.length / 2)] : null;
    const totalMs = s.completedAt
      ? new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime()
      : null;
    const leftPicks = judged.filter((c) => c.winnerId === c.leftItemId).length;
    const leftBias = judged.length > 0 ? leftPicks / judged.length : 0.5;

    let agreesWithConsensus = 0;
    let comparableCount = 0;
    for (const c of judged) {
      const left = itemMap[c.leftItemId];
      const right = itemMap[c.rightItemId];
      if (!left || !right || !c.winnerId) continue;
      if (Math.abs(left.mu - right.mu) < 10) continue;
      comparableCount++;
      const higherMuId = left.mu > right.mu ? c.leftItemId : c.rightItemId;
      if (c.winnerId === higherMuId) agreesWithConsensus++;
    }
    const consensusRate = comparableCount > 0 ? agreesWithConsensus / comparableCount : null;

    return {
      email: s.participantEmail ?? "",
      sessionId: s.id,
      comparisonsCompleted: judged.length,
      comparisonsExpected,
      medianTimeMs: medianMs,
      totalTimeMs: totalMs,
      leftBiasPercent: Math.round(leftBias * 100),
      consensusPercent: consensusRate !== null ? Math.round(consensusRate * 100) : null,
      status: s.status,
      verificationStatus: s.verificationStatus,
      botScore: s.botScore,
    };
  });

  // Serialize judge data for client component
  const judgeData = sessions.map((s) => {
    const demo = s.judgeDemographics as Record<string, unknown> | null;
    return {
    sessionId: s.id,
    email: s.participantEmail,
    isAiGenerated: s.isAiGenerated,
    aiPersona: s.aiPersona,
    occupation: (demo?.jobTitle as string) || null,
    city: (demo?.city as string) || null,
    state: (demo?.state as string) || null,
    age: (demo?.age as number) || null,
    sex: (demo?.sex as string) || null,
    status: s.status,
    verificationStatus: s.verificationStatus,
    botScore: s.botScore,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
    comparisonsExpected,
    comparisons: s.comparisons.map((c) => ({
      id: c.id,
      leftItemId: c.leftItemId,
      rightItemId: c.rightItemId,
      winnerId: c.winnerId,
      createdAt: c.createdAt.toISOString(),
      judgedAt: c.judgedAt?.toISOString() ?? null,
    })),
  }; });

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Reliability
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {reliability.toFixed(2)}
              </span>
              <Badge className={reliabilityColor}>
                {reliabilityLabel}
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{items.length}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Comparisons
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{totalComparisons}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Judges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{totalJudges}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{Math.round(completionRate * 100)}%</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Median Time/Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">
              {globalMedianMs !== null ? `${(globalMedianMs / 1000).toFixed(1)}s` : "—"}
            </span>
          </CardContent>
        </Card>
      </div>

      {reliability < 0.7 && totalComparisons > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-3 text-sm text-yellow-800">
            Reliability is low. More comparisons from additional judges will improve ranking accuracy.
          </CardContent>
        </Card>
      )}

      {/* Export buttons */}
      <div className="flex justify-end">
        <ExportDataButtons
          rankings={rankingsExport}
          judges={judgesExport}
          hasCanvasItems={hasCanvasItems}
        />
      </div>

      {/* Rankings table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Item Rankings</h2>
        <Card>
          <CardContent className="p-0">
            <RankingsTable
              items={items.map((item) => ({
                id: item.id,
                label: item.label,
                mu: item.mu,
                sigmaSq: item.sigmaSq,
                comparisonCount: item.comparisonCount,
                content: item.content as {
                  sourceType?: string;
                  studentName?: string;
                  studentEmail?: string;
                } | null,
              }))}
              hasCanvasItems={hasCanvasItems}
            />
          </CardContent>
        </Card>
      </div>

      {/* Judges table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Judge Analytics</h2>
        <JudgesTable judges={judgeData} items={itemMap} />
      </div>
    </div>
  );
}
