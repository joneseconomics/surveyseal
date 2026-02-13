import { auth } from "@/auth";
import { db } from "@/lib/db";
import { requireAccess } from "@/lib/access";
import { notFound, redirect } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

export default async function SurveyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  try {
    await requireAccess(id, session.user.id, "viewer");
  } catch {
    notFound();
  }

  const survey = await db.survey.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, type: true },
  });

  if (!survey) notFound();

  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";

  return (
    <div className="space-y-6">
      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder" asChild>
            <Link href={`/dashboard/surveys/${id}`}>Builder</Link>
          </TabsTrigger>
          <TabsTrigger value="responses" asChild>
            <Link href={`/dashboard/surveys/${id}/responses`}>Responses</Link>
          </TabsTrigger>
          {isCJ && (
            <TabsTrigger value="rankings" asChild>
              <Link href={`/dashboard/surveys/${id}/rankings`}>Rankings</Link>
            </TabsTrigger>
          )}
          <TabsTrigger value="ai-agent" asChild>
            <Link href={`/dashboard/surveys/${id}/ai-agent`}>AI Agent</Link>
          </TabsTrigger>
          <TabsTrigger value="settings" asChild>
            <Link href={`/dashboard/surveys/${id}/settings`}>Settings</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>
      {children}
    </div>
  );
}
