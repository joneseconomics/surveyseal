import { db } from "@/lib/db";
import { getSurveySessionId } from "@/lib/session";
import { redirect } from "next/navigation";
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
      responses: { select: { questionId: true } },
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
    const allVPQuestions = allQuestions.filter((q) => q.isVerificationPoint);
    const verificationPointNumber = allVPQuestions.findIndex((q) => q.id === currentQuestion.id) + 1;

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <VerificationGate
          sessionId={sessionId}
          surveyId={surveyId}
          questionId={currentQuestion.id}
          position={currentQuestion.position}
          totalQuestions={allQuestions.length}
          timerSeconds={survey?.verificationPointTimerSeconds ?? 30}
          verificationPointNumber={verificationPointNumber}
          totalVerificationPoints={allVPQuestions.length}
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
  const totalNonVPs = allQuestions.filter((q) => !q.isVerificationPoint).length;

  // Compute this question's display number (1-based, among non-verification-point questions)
  const nonVPQuestions = allQuestions.filter((q) => !q.isVerificationPoint);
  const questionDisplayIndex = nonVPQuestions.findIndex((q) => q.id === currentQuestion.id);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <QuestionRenderer
        sessionId={sessionId}
        surveyId={surveyId}
        question={currentQuestion}
        position={questionDisplayIndex >= 0 ? questionDisplayIndex : currentPosition}
        totalQuestions={totalNonVPs}
        isAnswered={isAnswered}
      />
    </div>
  );
}
