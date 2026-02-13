import { db } from "@/lib/db";
import { getSurveySessionId } from "@/lib/session";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ExitSurveyButtons } from "@/components/survey/exit-survey-buttons";
import { VerificationGate } from "@/components/survey/verification-gate";
import { QuestionRenderer } from "@/components/survey/question-renderer";
import { SubmitSurvey } from "@/components/survey/submit-survey";

export default async function SurveyQuestionPage({
  params,
  searchParams,
}: {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { surveyId } = await params;
  const { q } = await searchParams;

  const sessionId = await getSurveySessionId(surveyId);
  if (!sessionId) redirect(`/s/${surveyId}`);

  const session = await db.surveySession.findUnique({
    where: { id: sessionId, status: "ACTIVE" },
    include: {
      verificationPoints: true,
      responses: { select: { questionId: true, answer: true } },
    },
  });

  if (!session) redirect(`/s/${surveyId}`);
  if (session.status === "COMPLETED") redirect(`/s/${surveyId}/complete`);

  // Get all questions ordered by position
  const [allQuestions, survey] = await Promise.all([
    db.question.findMany({
      where: { surveyId },
      orderBy: { position: "asc" },
    }),
    db.survey.findUnique({
      where: { id: surveyId },
      select: { verificationPointTimerSeconds: true },
    }),
  ]);

  // Build set of validated verification point question IDs
  const validatedVPs = new Set(
    session.verificationPoints
      .filter((cp) => cp.validatedAt !== null)
      .map((cp) => cp.questionId)
  );

  const answeredQuestions = new Set(session.responses.map((r) => r.questionId));
  const answersByQuestion = new Map(session.responses.map((r) => [r.questionId, r.answer]));

  // ─── Server-side question gating ───────────────────────────────────────
  // Determine the range of questions the participant can currently see:
  // From: the position after the last validated verification point (or 0)
  // To: the position of the next unvalidated verification point (inclusive)

  // Find the next unvalidated verification point
  const nextUnvalidatedVP = allQuestions.find(
    (q) => q.isVerificationPoint && !validatedVPs.has(q.id)
  );

  // Determine the current question index
  const currentPosition = q ? parseInt(q, 10) : findNextUnansweredPosition();

  function findNextUnansweredPosition(): number {
    for (const question of allQuestions) {
      if (question.isVerificationPoint && !validatedVPs.has(question.id)) {
        return question.position; // Show the verification gate
      }
      if (!answeredQuestions.has(question.id)) {
        return question.position;
      }
    }
    return allQuestions.length; // All done
  }

  // Enforce gating: don't allow access beyond the next unvalidated verification point
  if (
    nextUnvalidatedVP &&
    currentPosition > nextUnvalidatedVP.position
  ) {
    redirect(`/s/${surveyId}/q?q=${nextUnvalidatedVP.position}`);
  }

  const currentQuestion = allQuestions.find((q) => q.position === currentPosition);

  // If no more questions, check if all verification points are resolved (verified or skipped)
  if (!currentQuestion) {
    const allVPs = allQuestions.filter((q) => q.isVerificationPoint);
    const allResolved = allVPs.every((cp) => validatedVPs.has(cp.id));

    if (allResolved) {
      return (
        <SubmitSurvey
          sessionId={sessionId}
          surveyId={surveyId}
        />
      );
    }
    // Otherwise redirect to the next verification point
    if (nextUnvalidatedVP) {
      redirect(`/s/${surveyId}/q?q=${nextUnvalidatedVP.position}`);
    }
    // Fallback: all VPs resolved but no current question — go to submit
    return (
      <SubmitSurvey
        sessionId={sessionId}
        surveyId={surveyId}
      />
    );
  }

  // If this is a verification point question, show the verification gate
  if (currentQuestion.isVerificationPoint && !validatedVPs.has(currentQuestion.id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <VerificationGate
          sessionId={sessionId}
          surveyId={surveyId}
          questionId={currentQuestion.id}
          position={currentQuestion.position}
          totalQuestions={allQuestions.length}
          timerSeconds={survey?.verificationPointTimerSeconds ?? 30}
        />
      </div>
    );
  }

  // If this is a verification point that's already validated, skip to next
  if (currentQuestion.isVerificationPoint && validatedVPs.has(currentQuestion.id)) {
    redirect(`/s/${surveyId}/q?q=${currentPosition + 1}`);
  }

  // Render the question
  const isAnswered = answeredQuestions.has(currentQuestion.id);
  const nonVPQuestions = allQuestions.filter((q) => !q.isVerificationPoint);
  const totalNonVPs = nonVPQuestions.length;

  // Compute this question's display number (1-based, among non-verification-point questions)
  const questionDisplayIndex = nonVPQuestions.findIndex((q) => q.id === currentQuestion.id);

  // Find the next position in the question list (database position, not display index)
  const currentIdx = allQuestions.findIndex((q) => q.id === currentQuestion.id);
  const nextPosition = currentIdx < allQuestions.length - 1
    ? allQuestions[currentIdx + 1].position
    : allQuestions[allQuestions.length - 1].position + 1;

  // Find the previous answered non-VP question for "Go Back"
  const prevNonVP = questionDisplayIndex > 0 ? nonVPQuestions[questionDisplayIndex - 1] : null;
  const prevPosition = prevNonVP ? prevNonVP.position : null;

  // "Go Forward" — enabled if the current question is answered and there's a next question
  const canGoForward = isAnswered && currentIdx < allQuestions.length - 1;

  // Progress: how many non-VP questions have been answered
  const answeredNonVPCount = nonVPQuestions.filter((q) => answeredQuestions.has(q.id)).length;
  const progress = totalNonVPs > 0 ? (answeredNonVPCount / totalNonVPs) * 100 : 0;

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Progress bar + navigation */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-3">
            {prevPosition !== null ? (
              <a
                href={`/s/${surveyId}/q?q=${prevPosition}`}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Go Back</span>
              </a>
            ) : (
              <span className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground opacity-30">
                <ChevronLeft className="h-4 w-4" />
                <span>Go Back</span>
              </span>
            )}
            <div className="flex-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {questionDisplayIndex >= 0 ? questionDisplayIndex + 1 : "?"} / {totalNonVPs}
            </span>
            {canGoForward ? (
              <a
                href={`/s/${surveyId}/q?q=${nextPosition}`}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <span>Go Forward</span>
                <ChevronRight className="h-4 w-4" />
              </a>
            ) : (
              <span className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground opacity-30">
                <span>Go Forward</span>
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
            <ExitSurveyButtons surveyId={surveyId} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <QuestionRenderer
          sessionId={sessionId}
          surveyId={surveyId}
          question={currentQuestion}
          isAnswered={isAnswered}
          existingAnswer={answersByQuestion.get(currentQuestion.id) ?? null}
          nextPosition={nextPosition}
        />
      </div>
    </div>
  );
}
