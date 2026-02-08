import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeReliability } from "@/lib/cj/reliability";
import { RankingsTable } from "@/components/dashboard/rankings-table";

export default async function RankingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const survey = await db.survey.findUnique({
    where: { id, ownerId: session.user.id },
    select: { type: true },
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

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
              Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-2xl font-bold">{items.length}</span>
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

      {/* Rankings table */}
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
            hasCanvasItems={items.some(
              (item) =>
                (item.content as { sourceType?: string } | null)?.sourceType === "canvas",
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
