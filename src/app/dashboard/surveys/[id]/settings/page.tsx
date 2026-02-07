import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { updateSurveySettings } from "@/lib/actions/survey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Smartphone, Users } from "lucide-react";
import { TapInSettings } from "@/components/dashboard/tapin-settings";

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
      checkpointTimerSeconds: true,
      requireLogin: true,
      tapinApiKey: true,
      tapinCampaignId: true,
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
            <input type="hidden" name="checkpointTimerSeconds" value={survey.checkpointTimerSeconds} />
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
            Configure verification point settings and TapIn integration for post-survey verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TapInSettings
            surveyId={survey.id}
            checkpointTimerSeconds={survey.checkpointTimerSeconds}
            requireLogin={survey.requireLogin}
            tapinApiKey={survey.tapinApiKey}
            tapinGroupId={survey.tapinCampaignId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
