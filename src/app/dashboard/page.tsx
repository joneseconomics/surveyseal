import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteSurveyButton } from "@/components/dashboard/delete-survey-button";

const statusColors = {
  DRAFT: "secondary",
  LIVE: "default",
  CLOSED: "outline",
} as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const surveys = await db.survey.findMany({
    where: { ownerId: session.user.id },
    include: {
      _count: { select: { sessions: true } },
      questions: { select: { isVerificationPoint: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your Surveys</h1>
          <p className="text-muted-foreground">Create and manage verified surveys.</p>
        </div>
        <Link href="/dashboard/surveys/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Survey
          </Button>
        </Link>
      </div>

      {surveys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">No surveys yet. Create your first one!</p>
            <Link href="/dashboard/surveys/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Survey
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Link key={survey.id} href={`/dashboard/surveys/${survey.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{survey.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColors[survey.status]}>{survey.status}</Badge>
                      <DeleteSurveyButton surveyId={survey.id} />
                    </div>
                  </div>
                  {survey.description && (
                    <CardDescription className="line-clamp-2">
                      {survey.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>{survey.questions.filter((q) => !q.isVerificationPoint).length} questions</span>
                    <span>{survey.questions.filter((q) => q.isVerificationPoint).length} verification points</span>
                    <span>{survey._count.sessions} responses</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
