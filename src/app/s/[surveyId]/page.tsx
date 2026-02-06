import { db } from "@/lib/db";
import { getSurveySessionId, setSurveySessionId } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { randomBytes } from "crypto";

export default async function SurveyLandingPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const survey = await db.survey.findUnique({
    where: { id: surveyId, status: "LIVE" },
    select: { id: true, title: true, description: true },
  });

  if (!survey) notFound();

  // Check if user already has an active session
  const existingSessionId = await getSurveySessionId(surveyId);
  if (existingSessionId) {
    const existingSession = await db.surveySession.findUnique({
      where: { id: existingSessionId, status: "ACTIVE" },
    });
    if (existingSession) {
      redirect(`/s/${surveyId}/q`);
    }
  }

  async function beginSurvey() {
    "use server";
    const sessionSecret = randomBytes(32).toString("hex");

    const session = await db.surveySession.create({
      data: {
        surveyId,
        sessionSecret,
      },
    });

    await setSurveySessionId(surveyId, session.id);
    redirect(`/s/${surveyId}/q`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{survey.title}</CardTitle>
          {survey.description && (
            <CardDescription className="text-base">{survey.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This survey uses NFC card verification. You will need to tap your NFC card at three
            checkpoints during the survey.
          </p>
          <form action={beginSurvey}>
            <Button size="lg" className="w-full">
              Begin Survey
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
