import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { SurveyBuilder } from "@/components/dashboard/survey-builder";

export default async function SurveyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const survey = await db.survey.findUnique({
    where: { id, ownerId: session.user.id },
    include: {
      questions: { orderBy: { position: "asc" } },
      cjItems: { orderBy: { position: "asc" } },
      _count: { select: { sessions: true } },
    },
  });

  if (!survey) notFound();

  return (
    <SurveyBuilder
      survey={survey}
      questions={survey.questions}
      responseCount={survey._count.sessions}
      cjItems={
        survey.type === "COMPARATIVE_JUDGMENT"
          ? survey.cjItems.map((item) => ({
              id: item.id,
              label: item.label,
              content: item.content as { text?: string; imageUrl?: string; description?: string; fileUrl?: string; fileType?: string; fileName?: string; filePath?: string },
              position: item.position,
            }))
          : undefined
      }
    />
  );
}
