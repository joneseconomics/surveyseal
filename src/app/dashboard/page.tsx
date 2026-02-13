import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DeleteSurveyButton } from "@/components/dashboard/delete-survey-button";
import { CopySurveyButton } from "@/components/dashboard/copy-survey-button";

const statusColors = {
  DRAFT: "secondary",
  LIVE: "default",
  CLOSED: "outline",
} as const;

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [ownedSurveys, collaborations] = await Promise.all([
    db.survey.findMany({
      where: { ownerId: session.user.id },
      include: {
        _count: { select: { sessions: true, cjItems: true } },
        questions: { select: { isVerificationPoint: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    db.surveyCollaborator.findMany({
      where: { userId: session.user.id, acceptedAt: { not: null } },
      include: {
        survey: {
          include: {
            owner: { select: { name: true, email: true } },
            _count: { select: { sessions: true, cjItems: true } },
            questions: { select: { isVerificationPoint: true } },
          },
        },
      },
    }),
  ]);

  const sharedSurveys = collaborations.map((c) => ({
    ...c.survey,
    _isShared: true as const,
    _collaboratorRole: c.role,
    _ownerName: c.survey.owner.name ?? c.survey.owner.email ?? "Unknown",
  }));

  const allSurveys = [
    ...ownedSurveys.map((s) => ({ ...s, _isShared: false as const, _collaboratorRole: null as string | null, _ownerName: null as string | null })),
    ...sharedSurveys,
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

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

      {allSurveys.length === 0 ? (
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
          {allSurveys.map((survey) => (
            <Link key={survey.id} href={`/dashboard/surveys/${survey.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{survey.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      {survey._isShared && (
                        <Badge variant="outline" className="text-xs">Shared</Badge>
                      )}
                      <Badge variant={statusColors[survey.status]}>{survey.status}</Badge>
                      {!survey._isShared && (
                        <>
                          <CopySurveyButton surveyId={survey.id} />
                          <DeleteSurveyButton surveyId={survey.id} />
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {survey.type === "COMPARATIVE_JUDGMENT"
                      ? `Comparative Judgment — ${survey.cjSubtype === "ASSIGNMENTS" ? "Assignments" : survey.cjSubtype === "RESUMES" ? "Resumes" : "General"}`
                      : "Questionnaire"}
                    {survey._isShared && survey._ownerName && (
                      <span> · Shared by {survey._ownerName}</span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {survey.type === "COMPARATIVE_JUDGMENT"
                      ? <span>{survey._count.cjItems} items</span>
                      : <span>{survey.questions.filter((q) => !q.isVerificationPoint).length} questions</span>
                    }
                    {survey.questions.filter((q) => q.isVerificationPoint).length > 0
                      ? <span>{survey.questions.filter((q) => q.isVerificationPoint).length} verification points</span>
                      : <span>TapIn disabled</span>
                    }
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
