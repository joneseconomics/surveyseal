import { db } from "@/lib/db";
import { getSurveySessionId } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
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
      cjAssignmentInstructions: true,
      cjJudgeInstructions: true,
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
          <CardTitle className="text-2xl">Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InstructionContent
            type={survey.type}
            cjSubtype={survey.cjSubtype}
            cjJobTitle={survey.cjJobTitle}
            cjJobUrl={survey.cjJobUrl}
            cjAssignmentInstructions={survey.cjAssignmentInstructions}
            cjJudgeInstructions={survey.cjJudgeInstructions}
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
  cjAssignmentInstructions,
  cjJudgeInstructions,
  hasVPs,
  vpTimerSeconds,
}: {
  type: string;
  cjSubtype: string | null;
  cjJobTitle: string | null;
  cjJobUrl: string | null;
  cjAssignmentInstructions: string | null;
  cjJudgeInstructions: string | null;
  hasVPs: boolean;
  vpTimerSeconds: number;
}) {
  const isCJ = type === "COMPARATIVE_JUDGMENT";

  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      {/* Questionnaire instructions */}
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

      {/* CJ instructions — custom or fallback defaults */}
      {isCJ && cjJudgeInstructions && (
        <div className="whitespace-pre-wrap">{linkifyText(cjJudgeInstructions)}</div>
      )}

      {isCJ && !cjJudgeInstructions && cjSubtype === "RESUMES" && (
        <p>
          You are a hiring manager for the position described below, and you will
          be shown two potential candidate r&#233;sum&#233;s to review. Please select the
          r&#233;sum&#233; of the candidate whom you would advance to the next round of
          interviews. Please note that you can only select one of the r&#233;sum&#233;s.
        </p>
      )}

      {isCJ && !cjJudgeInstructions && cjSubtype === "ASSIGNMENTS" && (
        <p>
          You will be comparing student submissions side by side. For each pair,
          carefully review both submissions and select the one you believe
          demonstrates higher quality.
        </p>
      )}

      {isCJ && !cjJudgeInstructions && (!cjSubtype || cjSubtype === "GENERIC") && (
        <p>
          You will be shown pairs of items side by side. For each pair,
          carefully review both items and select the one you believe is better.
        </p>
      )}

      {/* Embedded job posting */}
      {isCJ && cjJobUrl && (
        <div className="space-y-2">
          {cjJobTitle && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Position
              </p>
              <p className="text-base font-semibold text-foreground">{cjJobTitle}</p>
            </div>
          )}
          <iframe
            src={cjJobUrl}
            title="Job description"
            className="w-full rounded-lg border"
            style={{ minHeight: "400px" }}
            sandbox="allow-scripts allow-same-origin"
          />
          <a
            href={cjJobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open in new tab
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Assignment prompt */}
      {isCJ && cjSubtype === "ASSIGNMENTS" && cjAssignmentInstructions && (
        <div className="rounded-lg border bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
            Assignment Prompt
          </p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{cjAssignmentInstructions}</p>
        </div>
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

/** Turn URLs in plain text into clickable links */
function linkifyText(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
