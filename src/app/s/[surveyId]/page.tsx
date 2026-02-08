import { auth, signIn } from "@/auth";
import { db } from "@/lib/db";
import { getSurveySessionId, setSurveySessionId } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { getFilteredProviders } from "@/lib/auth-providers";

export default async function SurveyLandingPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const survey = await db.survey.findUnique({
    where: { id: surveyId, status: "LIVE" },
    select: {
      id: true, title: true, description: true, type: true,
      verificationPointTimerSeconds: true, requireLogin: true,
      authProviders: true,
      questions: { where: { isVerificationPoint: true }, select: { id: true } },
    },
  });

  if (!survey) notFound();

  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";
  const surveyRoute = isCJ ? `/s/${surveyId}/compare` : `/s/${surveyId}/q`;
  const hasVPs = survey.questions.length > 0;

  // Check if user already has an active session
  const existingSessionId = await getSurveySessionId(surveyId);
  if (existingSessionId) {
    const existingSession = await db.surveySession.findUnique({
      where: { id: existingSessionId, status: "ACTIVE" },
    });
    if (existingSession) {
      redirect(surveyRoute);
    }
  }

  // If login is required, check if user is already authenticated
  const authSession = await auth();
  const isAuthenticated = !!authSession?.user?.email;

  // If login is required and user is authenticated, auto-create session
  if (survey.requireLogin && isAuthenticated) {
    async function beginAuthenticatedSurvey() {
      "use server";
      const currentAuth = await auth();
      if (!currentAuth?.user?.email) redirect(`/s/${surveyId}`);

      const session = await db.surveySession.create({
        data: {
          surveyId,
          participantEmail: currentAuth.user.email.toLowerCase(),
          participantId: currentAuth.user.id,
        },
      });

      await setSurveySessionId(surveyId, session.id);
      redirect(surveyRoute);
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
            {hasVPs && (
              <p className="text-sm text-muted-foreground">
                This survey uses TapIn verification. At each verification point, you&apos;ll have{" "}
                {survey.verificationPointTimerSeconds} seconds to tap your TapIn Survey card on your phone.
                If you don&apos;t have a card, you can skip verification points and still complete the survey.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{authSession.user.email}</span>
            </p>
            <form action={beginAuthenticatedSurvey}>
              <Button size="lg" className="w-full">
                Begin Survey
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If login is required but user is NOT authenticated, show sign-in buttons
  if (survey.requireLogin && !isAuthenticated) {
    const providers = getFilteredProviders(survey.authProviders);

    async function signInWithProvider(formData: FormData) {
      "use server";
      const provider = formData.get("provider") as string;
      await signIn(provider, { redirectTo: `/s/${surveyId}` });
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
            {hasVPs && (
              <p className="text-sm text-muted-foreground">
                This survey uses TapIn verification. At each verification point, you&apos;ll have{" "}
                {survey.verificationPointTimerSeconds} seconds to tap your TapIn Survey card on your phone.
                If you don&apos;t have a card, you can skip verification points and still complete the survey.
              </p>
            )}
            <p className="text-sm font-medium">
              Sign in to get started
            </p>
            <div className="space-y-3">
              {providers.map((provider) => (
                <form key={provider.id} action={signInWithProvider}>
                  <input type="hidden" name="provider" value={provider.id} />
                  <Button variant="outline" className="w-full" type="submit">
                    {provider.icon}
                    Continue with {provider.name}
                  </Button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Anonymous mode (requireLogin = false): email-only form
  async function beginSurvey(formData: FormData) {
    "use server";
    const email = (formData.get("email") as string)?.toLowerCase().trim() || null;
    const surveyType = formData.get("surveyType") as string;

    const session = await db.surveySession.create({
      data: {
        surveyId,
        participantEmail: email,
      },
    });

    await setSurveySessionId(surveyId, session.id);
    redirect(
      surveyType === "COMPARATIVE_JUDGMENT"
        ? `/s/${surveyId}/compare`
        : `/s/${surveyId}/q`
    );
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
          <form action={beginSurvey} className="space-y-4">
            <input type="hidden" name="surveyType" value={survey.type} />
            <div className="space-y-2 text-left">
              <Label htmlFor="email">Email address (optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted-foreground">
                {hasVPs
                  ? "Providing your email helps match TapIn card taps with your responses. You can leave it blank for a fully anonymous response."
                  : "Optional. You can leave it blank for a fully anonymous response."}
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
