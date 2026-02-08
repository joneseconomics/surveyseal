import { db } from "@/lib/db";
import { getSurveySessionId } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, Briefcase, FileText, LayoutGrid, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function InstructionsPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const survey = await db.survey.findUnique({
    where: { id: surveyId, status: "LIVE" },
    select: {
      id: true,
      title: true,
      type: true,
      cjSubtype: true,
      cjJobTitle: true,
      cjJobUrl: true,
      verificationPointTimerSeconds: true,
      questions: { where: { isVerificationPoint: true }, select: { id: true } },
    },
  });

  if (!survey) notFound();

  // Must have an active session to view instructions
  const sessionId = await getSurveySessionId(surveyId);
  if (!sessionId) redirect(`/s/${surveyId}`);

  const session = await db.surveySession.findUnique({
    where: { id: sessionId, status: "ACTIVE" },
  });
  if (!session) redirect(`/s/${surveyId}`);

  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";
  const surveyRoute = isCJ ? `/s/${surveyId}/compare` : `/s/${surveyId}/q`;
  const hasVPs = survey.questions.length > 0;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            {isCJ ? (
              survey.cjSubtype === "RESUMES" ? (
                <Briefcase className="h-6 w-6 text-primary" />
              ) : survey.cjSubtype === "ASSIGNMENTS" ? (
                <FileText className="h-6 w-6 text-primary" />
              ) : (
                <LayoutGrid className="h-6 w-6 text-primary" />
              )
            ) : (
              <ClipboardList className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InstructionContent
            type={survey.type}
            cjSubtype={survey.cjSubtype}
            cjJobTitle={survey.cjJobTitle}
            cjJobUrl={survey.cjJobUrl}
            hasVPs={hasVPs}
            vpTimerSeconds={survey.verificationPointTimerSeconds}
          />

          <Link href={surveyRoute}>
            <Button size="lg" className="w-full">
              Continue to Survey
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function InstructionContent({
  type,
  cjSubtype,
  cjJobTitle,
  cjJobUrl,
  hasVPs,
  vpTimerSeconds,
}: {
  type: string;
  cjSubtype: string | null;
  cjJobTitle: string | null;
  cjJobUrl: string | null;
  hasVPs: boolean;
  vpTimerSeconds: number;
}) {
  const isCJ = type === "COMPARATIVE_JUDGMENT";

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {/* Survey-type-specific instructions */}
      {!isCJ && (
        <>
          <p>
            Please read each question carefully and provide your honest response.
            There are no right or wrong answers — we are interested in your genuine opinion.
          </p>
          <p>
            Take your time and answer each question to the best of your ability.
          </p>
        </>
      )}

      {isCJ && cjSubtype === "RESUMES" && (
        <>
          <p className="font-medium text-foreground">
            You are acting as a hiring manager reviewing candidates.
          </p>
          {cjJobTitle && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Position
              </p>
              <p className="text-base font-semibold text-foreground">{cjJobTitle}</p>
              {cjJobUrl && (
                <a
                  href={cjJobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  View full job posting
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
          <p>
            You will be shown pairs of resumes side by side. For each pair,
            carefully review both candidates and select the one you would be more
            likely to advance to the next round of interviews.
          </p>
          <p>
            Consider qualifications, experience, skills, and overall fit for the role.
          </p>
        </>
      )}

      {isCJ && cjSubtype === "ASSIGNMENTS" && (
        <>
          <p>
            You will be comparing student submissions side by side. For each pair,
            carefully review both submissions and select the one you believe
            demonstrates higher quality.
          </p>
          <p>
            Consider the overall quality of each submission, including content,
            clarity, and thoroughness.
          </p>
        </>
      )}

      {isCJ && (!cjSubtype || cjSubtype === "GENERIC") && (
        <>
          <p>
            You will be shown pairs of items side by side. For each pair,
            carefully review both items and select the one you believe is better.
          </p>
          <p>
            Take your time with each comparison — there are no right or wrong answers.
          </p>
        </>
      )}

      {/* Verification point notice */}
      {hasVPs && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
          <p className="text-xs">
            This survey includes TapIn verification points. At each verification point,
            you&apos;ll have {vpTimerSeconds} seconds to tap your TapIn Survey card on your phone.
            If you don&apos;t have a card, you can skip verification points and still complete the survey.
          </p>
        </div>
      )}
    </div>
  );
}
