import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, CheckCircle, Clock } from "lucide-react";
import { ResponseSummary } from "@/components/dashboard/response-summary";
import { ReconcileButton } from "@/components/dashboard/reconcile-button";

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const survey = await db.survey.findUnique({
    where: { id, ownerId: session.user.id },
    include: {
      questions: { where: { isVerificationPoint: true }, select: { id: true } },
      sessions: {
        select: {
          id: true,
          status: true,
          verificationStatus: true,
          startedAt: true,
          participantEmail: true,
          botScore: true,
          verificationPoints: { select: { validatedAt: true, verified: true } },
          responses: { select: { id: true } },
          tapinTaps: { select: { id: true } },
          _count: { select: { comparisons: true } },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });

  if (!survey) notFound();

  const totalVerificationPoints = survey.questions.length;
  const hasTapInKey = !!survey.tapinApiKey;
  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";

  return (
    <div className="space-y-6">
      <ResponseSummary
        total={survey.sessions.length}
        completed={survey.sessions.filter((s) => s.status === "COMPLETED").length}
        active={survey.sessions.filter((s) => s.status === "ACTIVE").length}
      />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Responses</h2>
        <div className="flex items-center gap-2">
          {hasTapInKey && <ReconcileButton surveyId={id} />}
          {survey.sessions.length > 0 && (
            <a href={`/api/survey/${id}/export`} download>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </a>
          )}
        </div>
      </div>

      {survey.sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No responses yet. Share the survey link to start collecting data.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Bot Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification Points</TableHead>
                  <TableHead>{isCJ ? "Comparisons" : "Responses"}</TableHead>
                  {hasTapInKey && <TableHead>TapIn Taps</TableHead>}
                  <TableHead>Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {survey.sessions.map((s) => {
                  const validatedCount = s.verificationPoints.filter(
                    (cp) => cp.validatedAt !== null
                  ).length;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">
                        {s.participantEmail || <span className="text-muted-foreground">Anonymous</span>}
                      </TableCell>
                      <TableCell>
                        <VerificationBadge status={s.verificationStatus} />
                      </TableCell>
                      <TableCell>
                        <BotRiskBadge score={s.botScore} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {validatedCount === totalVerificationPoints ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          {validatedCount}/{totalVerificationPoints}
                        </span>
                      </TableCell>
                      <TableCell>
                        {isCJ ? s._count.comparisons : s.responses.length}
                      </TableCell>
                      {hasTapInKey && (
                        <TableCell>
                          {s.tapinTaps.length > 0
                            ? `${s.tapinTaps.length} tap${s.tapinTaps.length !== 1 ? "s" : ""}`
                            : "\u2014"}
                        </TableCell>
                      )}
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(s.startedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <Badge variant="default">Completed</Badge>;
    case "ACTIVE":
      return <Badge variant="secondary">Active</Badge>;
    case "ABANDONED":
      return <Badge variant="outline">Abandoned</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function VerificationBadge({ status }: { status: string }) {
  switch (status) {
    case "VERIFIED":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Verified</Badge>;
    case "PARTIAL":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>;
    case "UNVERIFIED":
      return <Badge variant="outline">Unverified</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function BotRiskBadge({ score }: { score: number | null }) {
  if (score === null) {
    return <Badge variant="outline">N/A</Badge>;
  }
  const pct = Math.round(score * 100);
  if (score < 0.3) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Low ({pct}%)</Badge>;
  }
  if (score < 0.6) {
    return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium ({pct}%)</Badge>;
  }
  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">High ({pct}%)</Badge>;
}
