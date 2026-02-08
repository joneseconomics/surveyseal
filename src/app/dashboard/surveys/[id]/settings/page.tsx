import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { updateSurveySettings } from "@/lib/actions/survey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ExternalLink, Smartphone, Users, GraduationCap } from "lucide-react";
import { TapInSettings } from "@/components/dashboard/tapin-settings";
import { CanvasSettings } from "@/components/dashboard/canvas-settings";

export default async function SurveySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const survey = await db.survey.findUnique({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      type: true,
      verificationPointTimerSeconds: true,
      requireLogin: true,
      tapinApiKey: true,
      tapinCampaignId: true,
      canvasBaseUrl: true,
      canvasApiToken: true,
    },
  });

  if (!survey) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure verification and respondent settings for this survey.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Respondent Authentication</CardTitle>
          </div>
          <CardDescription>
            Control whether respondents must sign in before taking the survey.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSurveySettings} className="space-y-6">
            <input type="hidden" name="id" value={survey.id} />
            <input type="hidden" name="verificationPointTimerSeconds" value={survey.verificationPointTimerSeconds} />
            <input type="hidden" name="tapinApiKey" value={survey.tapinApiKey ?? ""} />
            <input type="hidden" name="tapinCampaignId" value={survey.tapinCampaignId ?? ""} />

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="requireLogin"
                name="requireLogin"
                defaultChecked={survey.requireLogin}
                className="mt-1 h-4 w-4"
              />
              <div>
                <Label htmlFor="requireLogin" className="font-medium">
                  Require sign-in to take this survey
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  When enabled, respondents must sign in with Google or Microsoft before starting.
                  When disabled, respondents enter only an email address, making the survey anonymous.
                </p>
              </div>
            </div>

            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">TapIn Verification</CardTitle>
          </div>
          <CardDescription>
            Configure verification point settings and TapIn integration for post-survey verification.{" "}
            <a
              href="https://store.tapin.us"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Order TapIn Survey cards
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TapInSettings
            surveyId={survey.id}
            verificationPointTimerSeconds={survey.verificationPointTimerSeconds}
            requireLogin={survey.requireLogin}
            tapinApiKey={survey.tapinApiKey}
            tapinGroupId={survey.tapinCampaignId}
          />
        </CardContent>
      </Card>

      {survey.type === "COMPARATIVE_JUDGMENT" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Canvas LMS Integration</CardTitle>
            </div>
            <CardDescription>
              Connect to Canvas LMS to import student assignment submissions as comparison items.{" "}
              <a
                href="https://community.canvaslms.com/t5/Student-Guide/How-do-I-manage-API-access-tokens-as-a-student/ta-p/273"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                How to generate a Canvas API token
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CanvasSettings
              surveyId={survey.id}
              canvasBaseUrl={survey.canvasBaseUrl}
              canvasApiToken={survey.canvasApiToken}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
