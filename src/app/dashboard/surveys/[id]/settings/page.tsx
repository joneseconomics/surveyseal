import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { updateSurveySettings } from "@/lib/actions/survey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Smartphone } from "lucide-react";

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
          Configure TapIn verification settings for this survey.
        </p>
      </div>

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
                Seconds respondents have to tap at each checkpoint. If the timer expires, the checkpoint is automatically skipped. Range: 10–300.
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
