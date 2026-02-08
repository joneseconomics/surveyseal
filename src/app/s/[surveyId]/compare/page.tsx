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
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

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
  const completedComparisons = session.comparisons.filter(
    (c) => c.judgedAt !== null
  ).length;

  // ─── Verification Point Gating ───────────────────────────────
  // VPs divide comparisons into N segments.
  // VP[i] triggers after segment i completes.
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

    // If we've completed enough comparisons for this segment boundary
    // and the VP is not yet validated, show the verification gate
    if (completedComparisons >= vpThreshold && !validatedVPs.has(vp.id)) {
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

  // ─── All comparisons done? ───────────────────────────────────
  if (completedComparisons >= totalComparisons) {
    const allVPsResolved = vpQuestions.every((vp) => validatedVPs.has(vp.id));
    if (allVPsResolved) {
      return (
        <SubmitSurvey sessionId={sessionId} surveyId={surveyId} />
      );
    }
    // Show next unvalidated VP
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

  // ─── Select next pair adaptively ─────────────────────────────
  const items = survey.cjItems.map((item) => ({
    id: item.id,
    mu: item.mu,
    sigmaSq: item.sigmaSq,
  }));

  const comparedKeys = buildComparedPairKeys(session.comparisons);
  const pair = selectNextPair(items, comparedKeys);

  if (!pair) {
    // All pairs exhausted for this judge — go to submit
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

  // Create comparison record
  const comparison = await db.comparison.create({
    data: {
      sessionId,
      leftItemId: leftItem.id,
      rightItemId: rightItem.id,
      position: session.comparisons.length,
    },
  });

  // Fetch full item data for display
  const [leftFull, rightFull] = await Promise.all([
    db.cJItem.findUnique({ where: { id: leftItem.id } }),
    db.cJItem.findUnique({ where: { id: rightItem.id } }),
  ]);

  if (!leftFull || !rightFull) redirect(`/s/${surveyId}`);

  return (
    <ComparisonView
      sessionId={sessionId}
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
      currentComparison={completedComparisons + 1}
      totalComparisons={totalComparisons}
    />
  );
}
