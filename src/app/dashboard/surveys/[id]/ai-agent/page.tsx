import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { requireAccess } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import { AiAgentPanel } from "@/components/dashboard/ai-agent-panel";

export default async function AiAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const accessLevel = await requireAccess(id, session.user.id, "viewer");
  const canEdit = accessLevel === "owner" || accessLevel === "editor";

  const [survey, user] = await Promise.all([
    db.survey.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        aiProvider: true,
        aiModel: true,
      },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { aiApiKey: true },
    }),
  ]);

  if (!survey) notFound();

  const [runs, judgePersonas, surveyJudges] = await Promise.all([
    db.aiAgentRun.findMany({
      where: { surveyId: id },
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        provider: true,
        model: true,
        persona: true,
        sessionCount: true,
        completedCount: true,
        failedCount: true,
        status: true,
        startedAt: true,
        completedAt: true,
        errorLog: true,
      },
    }),
    db.judgePersona.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        title: true,
        description: true,
        cvFileName: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
    }),
    db.surveySession.findMany({
      where: {
        surveyId: id,
        status: "COMPLETED",
        isAiGenerated: false,
        judgeDemographics: { path: ["cvFileUrl"], not: Prisma.DbNull },
      },
      orderBy: { completedAt: "desc" },
      select: {
        id: true,
        participantEmail: true,
        judgeDemographics: true,
        completedAt: true,
        generatedPersona: { select: { id: true } },
        _count: { select: { comparisons: true } },
      },
    }),
  ]);

  return (
    <AiAgentPanel
      surveyId={survey.id}
      surveyTitle={survey.title}
      surveyType={survey.type}
      surveyStatus={survey.status}
      hasApiKey={!!user?.aiApiKey}
      savedProvider={survey.aiProvider}
      savedModel={survey.aiModel}
      canEdit={canEdit}
      initialRuns={runs.map((r) => ({
        ...r,
        startedAt: r.startedAt.toISOString(),
        completedAt: r.completedAt?.toISOString() ?? null,
      }))}
      initialJudgePersonas={judgePersonas.map((j) => ({
        id: j.id,
        name: j.name,
        title: j.title,
        description: j.description,
        cvFileName: j.cvFileName,
        createdAt: j.createdAt.toISOString(),
        createdBy: j.createdBy,
      }))}
      initialSurveyJudges={surveyJudges.map((s) => {
        const d = s.judgeDemographics as Record<string, unknown> | null;
        return {
          sessionId: s.id,
          participantEmail: s.participantEmail,
          jobTitle: (d?.jobTitle as string) || null,
          employer: (d?.employer as string) || null,
          cvFileName: (d?.cvFileName as string) || null,
          completedAt: s.completedAt?.toISOString() ?? null,
          comparisonCount: s._count.comparisons,
          generatedPersonaId: s.generatedPersona?.id ?? null,
        };
      })}
    />
  );
}
