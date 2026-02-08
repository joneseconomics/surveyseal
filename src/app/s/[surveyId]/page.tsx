import { auth, signIn } from "@/auth";
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
    select: {
      id: true, title: true, description: true, type: true,
      verificationPointTimerSeconds: true, requireLogin: true,
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
              <form
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: `/s/${surveyId}` });
                }}
              >
                <Button variant="outline" className="w-full" type="submit">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signIn("microsoft-entra-id", { redirectTo: `/s/${surveyId}` });
                }}
              >
                <Button variant="outline" className="w-full" type="submit">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z" />
                    <path fill="#81bc06" d="M12 1h10v10H12z" />
                    <path fill="#05a6f0" d="M1 12h10v10H1z" />
                    <path fill="#ffba08" d="M12 12h10v10H12z" />
                  </svg>
                  Continue with Microsoft
                </Button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signIn("linkedin", { redirectTo: `/s/${surveyId}` });
                }}
              >
                <Button variant="outline" className="w-full" type="submit">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#0A66C2"
                      d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
                    />
                  </svg>
                  Continue with LinkedIn
                </Button>
              </form>
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
          <p className="text-sm text-muted-foreground">
            This survey uses TapIn verification. At each verification point, you&apos;ll have{" "}
            {survey.verificationPointTimerSeconds} seconds to tap your TapIn Survey card on your phone.
            If you don&apos;t have a card, you can skip verification points and still complete the survey.
          </p>
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
