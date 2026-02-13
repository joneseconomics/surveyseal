import { auth } from "@/auth";
import { db } from "@/lib/db";
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

  const survey = await db.survey.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      aiApiKey: true,
      aiProvider: true,
      aiModel: true,
    },
  });

  if (!survey) notFound();

  const runs = await db.aiAgentRun.findMany({
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
  });

  return (
    <AiAgentPanel
      surveyId={survey.id}
      surveyTitle={survey.title}
      surveyType={survey.type}
      surveyStatus={survey.status}
      hasApiKey={!!survey.aiApiKey}
      savedProvider={survey.aiProvider}
      savedModel={survey.aiModel}
      canEdit={canEdit}
      initialRuns={runs}
    />
  );
}
