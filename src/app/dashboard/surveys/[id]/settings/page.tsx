import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { updateSurveySettings } from "@/lib/actions/survey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone, Users } from "lucide-react";

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
            Control how checkpoints behave for respondents and configure TapIn integration for post-survey verification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateSurveySettings} className="space-y-6">
            <input type="hidden" name="id" value={survey.id} />
            <input type="hidden" name="requireLogin" value={survey.requireLogin ? "true" : "false"} />

            <div className="space-y-2">
              <Label htmlFor="checkpointTimerSeconds">Checkpoint Timer (seconds)</Label>
              <Input
                id="checkpointTimerSeconds"
                name="checkpointTimerSeconds"
                type="number"
                min={10}
                max={300}
                defaultValue={survey.checkpointTimerSeconds}
              />
              <p className="text-xs text-muted-foreground">
                Seconds respondents have to tap at each checkpoint. If the timer expires, the checkpoint is automatically skipped. Range: 10-300.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tapinApiKey">TapIn API Key</Label>
              <Input
                id="tapinApiKey"
                name="tapinApiKey"
                type="text"
                placeholder="tap_key_..."
                defaultValue={survey.tapinApiKey ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                Used for post-survey verification reconciliation. Get this from your TapIn dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tapinCampaignId">TapIn Campaign ID</Label>
              <Input
                id="tapinCampaignId"
                name="tapinCampaignId"
                type="text"
                placeholder="camp_..."
                defaultValue={survey.tapinCampaignId ?? ""}
              />
              <p className="text-xs text-muted-foreground">
                The TapIn campaign to match taps against. Found in your TapIn campaign settings.
              </p>
            </div>

            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
