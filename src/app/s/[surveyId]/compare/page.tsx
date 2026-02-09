import { db } from "@/lib/db";
import { getSurveySessionId } from "@/lib/session";
import { redirect } from "next/navigation";
import { VerificationGate } from "@/components/survey/verification-gate";
import { SubmitSurvey } from "@/components/survey/submit-survey";
import { ComparisonView } from "@/components/survey/comparison-view";
import {
  selectNextPair,
  buildComparedPairKeys,
} from "@/lib/cj/adaptive-pairing";

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ surveyId: string }>;
  searchParams: Promise<{ pos?: string }>;
}) {
  const { surveyId } = await params;
  const { pos: posParam } = await searchParams;

  const sessionId = await getSurveySessionId(surveyId);
  if (!sessionId) redirect(`/s/${surveyId}`);

  const session = await db.surveySession.findUnique({
    where: { id: sessionId, status: "ACTIVE" },
    include: {
      verificationPoints: true,
      comparisons: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!session) redirect(`/s/${surveyId}`);

  const survey = await db.survey.findUnique({
    where: { id: surveyId },
    include: {
      cjItems: { orderBy: { position: "asc" } },
      questions: {
        where: { isVerificationPoint: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!survey) redirect(`/s/${surveyId}`);

  const totalComparisons =
    survey.comparisonsPerJudge ?? Math.max(survey.cjItems.length - 1, 1);
  const judgedComparisons = session.comparisons.filter(
    (c) => c.judgedAt !== null
  );
  const completedCount = judgedComparisons.length;

  // Determine the frontier position (next unjudged)
  const frontierPosition = completedCount;

  // Parse requested position
  const requestedPos = posParam !== undefined ? parseInt(posParam, 10) : null;

  // Invalid position → redirect to frontier
  if (requestedPos !== null && (isNaN(requestedPos) || requestedPos < 0 || requestedPos > frontierPosition)) {
    redirect(`/s/${surveyId}/compare`);
  }

  const isReview = requestedPos !== null && requestedPos < frontierPosition;
  const currentPosition = requestedPos ?? frontierPosition;

  // ─── Review Mode: load existing comparison ──────────────────────
  if (isReview) {
    const existing = await db.comparison.findUnique({
      where: {
        sessionId_position: { sessionId, position: currentPosition },
      },
    });

    if (!existing) redirect(`/s/${surveyId}/compare`);

    const [leftFull, rightFull] = await Promise.all([
      db.cJItem.findUnique({ where: { id: existing.leftItemId } }),
      db.cJItem.findUnique({ where: { id: existing.rightItemId } }),
    ]);

    if (!leftFull || !rightFull) redirect(`/s/${surveyId}`);

    return (
      <ComparisonView
        sessionId={sessionId}
        surveyId={surveyId}
        comparisonId={existing.id}
        leftItem={{
          id: leftFull.id,
          label: leftFull.label,
          content: leftFull.content as { text?: string; imageUrl?: string; description?: string; fileUrl?: string; fileType?: string; fileName?: string; sourceType?: string; submissionUrl?: string },
        }}
        rightItem={{
          id: rightFull.id,
          label: rightFull.label,
          content: rightFull.content as { text?: string; imageUrl?: string; description?: string; fileUrl?: string; fileType?: string; fileName?: string; sourceType?: string; submissionUrl?: string },
        }}
        prompt={survey.cjPrompt ?? "Which item is better?"}
        currentComparison={currentPosition + 1}
        totalComparisons={totalComparisons}
        judgeInstructions={survey.cjJudgeInstructions}
        cjSubtype={survey.cjSubtype}
        cjJobUrl={survey.cjJobUrl}
        cjJobDescFileUrl={survey.cjJobDescFileUrl}
        cjJobDescFileType={survey.cjJobDescFileType}
        cjJobDescFileName={survey.cjJobDescFileName}
        cjAssignmentInstructions={survey.cjAssignmentInstructions}
        currentPosition={currentPosition}
        totalJudged={completedCount}
        isReview={true}
        existingWinnerId={existing.winnerId}
      />
    );
  }

  // ─── Frontier Mode ──────────────────────────────────────────────

  // Verification Point Gating (only at frontier)
  const vpQuestions = survey.questions;
  const validatedVPs = new Set(
    session.verificationPoints
      .filter((cp) => cp.validatedAt !== null)
      .map((cp) => cp.questionId)
  );

  const vpCount = vpQuestions.length;
  const segmentSize = vpCount > 0 ? Math.ceil(totalComparisons / vpCount) : totalComparisons;

  for (let i = 0; i < vpQuestions.length; i++) {
    const vpThreshold = segmentSize * (i + 1);
    const vp = vpQuestions[i];

    if (completedCount >= vpThreshold && !validatedVPs.has(vp.id)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
          <VerificationGate
            sessionId={sessionId}
            surveyId={surveyId}
            questionId={vp.id}
            position={0}
            totalQuestions={totalComparisons}
            timerSeconds={survey.verificationPointTimerSeconds}
            verificationPointNumber={i + 1}
            totalVerificationPoints={vpQuestions.length}
            returnUrl={`/s/${surveyId}/compare`}
          />
        </div>
      );
    }
  }

  // All comparisons done?
  if (completedCount >= totalComparisons) {
    const allVPsResolved = vpQuestions.every((vp) => validatedVPs.has(vp.id));
    if (allVPsResolved) {
      return (
        <SubmitSurvey sessionId={sessionId} surveyId={surveyId} />
      );
    }
    const nextVP = vpQuestions.find((vp) => !validatedVPs.has(vp.id))!;
    const vpIndex = vpQuestions.indexOf(nextVP);
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
        <VerificationGate
          sessionId={sessionId}
          surveyId={surveyId}
          questionId={nextVP.id}
          position={0}
          totalQuestions={totalComparisons}
          timerSeconds={survey.verificationPointTimerSeconds}
          verificationPointNumber={vpIndex + 1}
          totalVerificationPoints={vpQuestions.length}
        />
      </div>
    );
  }

  // Check if an unjudged comparison already exists at frontier position
  // (handles returning from review mode)
  const existingFrontier = await db.comparison.findUnique({
    where: {
      sessionId_position: { sessionId, position: frontierPosition },
    },
  });

  let comparison;
  if (existingFrontier && existingFrontier.winnerId === null) {
    comparison = existingFrontier;
  } else {
    // Select next pair adaptively
    const items = survey.cjItems.map((item) => ({
      id: item.id,
      mu: item.mu,
      sigmaSq: item.sigmaSq,
    }));

    const comparedKeys = buildComparedPairKeys(session.comparisons);
    const pair = selectNextPair(items, comparedKeys);

    if (!pair) {
      const allVPsResolved = vpQuestions.every((vp) => validatedVPs.has(vp.id));
      if (allVPsResolved) {
        return (
          <SubmitSurvey sessionId={sessionId} surveyId={surveyId} />
        );
      }
      const nextVP = vpQuestions.find((vp) => !validatedVPs.has(vp.id))!;
      const vpIndex = vpQuestions.indexOf(nextVP);
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
          <VerificationGate
            sessionId={sessionId}
            surveyId={surveyId}
            questionId={nextVP.id}
            position={0}
            totalQuestions={totalComparisons}
            timerSeconds={survey.verificationPointTimerSeconds}
            verificationPointNumber={vpIndex + 1}
            totalVerificationPoints={vpQuestions.length}
          />
        </div>
      );
    }

    // Randomly assign left/right to counter position bias
    const swap = Math.random() < 0.5;
    const leftItem = swap ? pair.right : pair.left;
    const rightItem = swap ? pair.left : pair.right;

    comparison = await db.comparison.create({
      data: {
        sessionId,
        leftItemId: leftItem.id,
        rightItemId: rightItem.id,
        position: session.comparisons.length,
      },
    });
  }

  // Fetch full item data for display
  const [leftFull, rightFull] = await Promise.all([
    db.cJItem.findUnique({ where: { id: comparison.leftItemId } }),
    db.cJItem.findUnique({ where: { id: comparison.rightItemId } }),
  ]);

  if (!leftFull || !rightFull) redirect(`/s/${surveyId}`);

  return (
    <ComparisonView
      sessionId={sessionId}
      surveyId={surveyId}
      comparisonId={comparison.id}
      leftItem={{
        id: leftFull.id,
        label: leftFull.label,
        content: leftFull.content as { text?: string; imageUrl?: string; description?: string; fileUrl?: string; fileType?: string; fileName?: string; sourceType?: string; submissionUrl?: string },
      }}
      rightItem={{
        id: rightFull.id,
        label: rightFull.label,
        content: rightFull.content as { text?: string; imageUrl?: string; description?: string; fileUrl?: string; fileType?: string; fileName?: string; sourceType?: string; submissionUrl?: string },
      }}
      prompt={survey.cjPrompt ?? "Which item is better?"}
      currentComparison={completedCount + 1}
      totalComparisons={totalComparisons}
      judgeInstructions={survey.cjJudgeInstructions}
      cjSubtype={survey.cjSubtype}
      cjJobUrl={survey.cjJobUrl}
      cjAssignmentInstructions={survey.cjAssignmentInstructions}
      currentPosition={frontierPosition}
      totalJudged={completedCount}
      isReview={false}
      existingWinnerId={null}
    />
  );
}
