import { db } from "@/lib/db";
import { getSurveySessionId } from "@/lib/session";
import { redirect } from "next/navigation";
import { CheckpointGate } from "@/components/survey/checkpoint-gate";
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
      checkpoints: true,
      responses: { select: { questionId: true } },
    },
  });

  if (!session) redirect(`/s/${surveyId}`);
  if (session.status === "COMPLETED") redirect(`/s/${surveyId}/complete`);

  // Get all questions ordered by position
  const allQuestions = await db.question.findMany({
    where: { surveyId },
    orderBy: { position: "asc" },
  });

  // Build set of validated checkpoint question IDs
  const validatedCheckpoints = new Set(
    session.checkpoints
      .filter((cp) => cp.validatedAt !== null)
      .map((cp) => cp.questionId)
  );

  const answeredQuestions = new Set(session.responses.map((r) => r.questionId));

  // ─── Server-side question gating ───────────────────────────────────────
  // Determine the range of questions the participant can currently see:
  // From: the position after the last validated checkpoint (or 0)
  // To: the position of the next unvalidated checkpoint (inclusive)

  // Find the next unvalidated checkpoint
  const nextUnvalidatedCheckpoint = allQuestions.find(
    (q) => q.isCheckpoint && !validatedCheckpoints.has(q.id)
  );

  // Determine the current question index
  const currentPosition = q ? parseInt(q, 10) : findNextUnansweredPosition();

  function findNextUnansweredPosition(): number {
    for (const question of allQuestions) {
      if (question.isCheckpoint && !validatedCheckpoints.has(question.id)) {
        return question.position; // Show the checkpoint gate
      }
      if (!answeredQuestions.has(question.id)) {
        return question.position;
      }
    }
    return allQuestions.length; // All done
  }

  // Enforce gating: don't allow access beyond the next unvalidated checkpoint
  if (
    nextUnvalidatedCheckpoint &&
    currentPosition > nextUnvalidatedCheckpoint.position
  ) {
    redirect(`/s/${surveyId}/q?q=${nextUnvalidatedCheckpoint.position}`);
  }

  const currentQuestion = allQuestions.find((q) => q.position === currentPosition);

  // If no more questions, check if all checkpoints are resolved (verified or skipped)
  if (!currentQuestion) {
    const allCheckpoints = allQuestions.filter((q) => q.isCheckpoint);
    const allResolved = allCheckpoints.every((cp) => validatedCheckpoints.has(cp.id));

    if (allResolved) {
      return (
        <SubmitSurvey
          sessionId={sessionId}
          surveyId={surveyId}
        />
      );
    }
    // Otherwise redirect to the next checkpoint
    redirect(`/s/${surveyId}/q?q=${nextUnvalidatedCheckpoint!.position}`);
  }

  // If this is a checkpoint question, show the checkpoint gate
  if (currentQuestion.isCheckpoint && !validatedCheckpoints.has(currentQuestion.id)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <CheckpointGate
          sessionId={sessionId}
          surveyId={surveyId}
          questionId={currentQuestion.id}
          position={currentQuestion.position}
          totalQuestions={allQuestions.length}
        />
      </div>
    );
  }

  // If this is a checkpoint that's already validated, skip to next
  if (currentQuestion.isCheckpoint && validatedCheckpoints.has(currentQuestion.id)) {
    redirect(`/s/${surveyId}/q?q=${currentPosition + 1}`);
  }

  // Render the question
  const isAnswered = answeredQuestions.has(currentQuestion.id);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <QuestionRenderer
        sessionId={sessionId}
        surveyId={surveyId}
        question={currentQuestion}
        position={currentPosition}
        totalQuestions={allQuestions.length}
        isAnswered={isAnswered}
      />
    </div>
  );
}
