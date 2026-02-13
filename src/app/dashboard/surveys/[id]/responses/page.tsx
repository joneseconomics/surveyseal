import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
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
import { Download } from "lucide-react";
import { ResponseSummary } from "@/components/dashboard/response-summary";
import { ReconcileButton } from "@/components/dashboard/reconcile-button";
import { DeleteResponseButton } from "@/components/dashboard/delete-response-button";

interface JudgeDemographics {
  jobTitle?: string;
  employer?: string;
  city?: string;
  state?: string;
  hasHiringExperience?: boolean;
  hiringRoles?: string[];
}

export default async function ResponsesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const accessLevel = await requireAccess(id, session.user.id, "viewer");

  const survey = await db.survey.findUnique({
    where: { id },
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
          judgeDemographics: true,
          isAiGenerated: true,
          aiPersona: true,
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

  const hasTapInKey = !!survey.tapinApiKey;
  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";
  const isResumes = isCJ && survey.cjSubtype === "RESUMES";
  const canEdit = accessLevel === "owner" || accessLevel === "editor";

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
          {hasTapInKey && canEdit && <ReconcileButton surveyId={id} />}
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
                  <TableHead>{isResumes ? "Judge" : "Participant"}</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead>Bot Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{isCJ ? "Comparisons" : "Responses"}</TableHead>
                  {isResumes && <TableHead>Hiring Exp.</TableHead>}
                  {hasTapInKey && <TableHead>TapIn Taps</TableHead>}
                  <TableHead>Started</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {survey.sessions.map((s) => {
                  const demo = (s.judgeDemographics as JudgeDemographics) ?? {};
                  const locationParts = [demo.city, demo.state].filter(Boolean);
                  const subtitle = [
                    demo.jobTitle && demo.employer
                      ? `${demo.jobTitle} at ${demo.employer}`
                      : demo.jobTitle || demo.employer || null,
                    locationParts.length > 0 ? locationParts.join(", ") : null,
                  ].filter(Boolean).join(" · ");

                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="text-xs">
                            {s.participantEmail || <span className="text-muted-foreground">Anonymous</span>}
                          </p>
                          {isResumes && subtitle && (
                            <p className="text-xs text-muted-foreground">{subtitle}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.isAiGenerated ? (
                          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                            AI{s.aiPersona ? ` (${s.aiPersona})` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Human</Badge>
                        )}
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
                        {isCJ ? s._count.comparisons : s.responses.length}
                      </TableCell>
                      {isResumes && (
                        <TableCell>
                          {demo.hasHiringExperience === true ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Yes</Badge>
                          ) : demo.hasHiringExperience === false ? (
                            <Badge variant="outline">No</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">&mdash;</span>
                          )}
                        </TableCell>
                      )}
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
                      {canEdit && (
                        <TableCell>
                          <DeleteResponseButton surveyId={id} sessionId={s.id} />
                        </TableCell>
                      )}
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
