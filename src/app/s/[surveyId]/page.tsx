import { db } from "@/lib/db";
import { getSurveySessionId, setSurveySessionId } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { notFound, redirect } from "next/navigation";

export default async function SurveyLandingPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const survey = await db.survey.findUnique({
    where: { id: surveyId, status: "LIVE" },
    select: { id: true, title: true, description: true, checkpointTimerSeconds: true },
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

  async function beginSurvey(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.toLowerCase().trim() || null;

    const session = await db.surveySession.create({
      data: {
        surveyId,
        participantEmail: email,
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
            This survey uses TapIn verification. At each checkpoint, you&apos;ll have{" "}
            {survey.checkpointTimerSeconds} seconds to tap your TapIn Survey card on your phone.
            If you don&apos;t have a card, you can skip checkpoints and still complete the survey.
          </p>
          <form action={beginSurvey} className="space-y-4">
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
              <p className="text-xs text-muted-foreground">
                Your email is used after the survey to match your TapIn card taps with your responses.
                If you don&apos;t have a card, you can still complete the survey.
              </p>
            </div>
            <Button size="lg" className="w-full">
              Begin Survey
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
