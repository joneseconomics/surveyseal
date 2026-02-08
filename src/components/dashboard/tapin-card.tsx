"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExternalLink, Smartphone } from "lucide-react";
import { TapInSettings } from "@/components/dashboard/tapin-settings";
import { updateVerificationPointCount } from "@/lib/actions/cj-item";

interface TapInCardProps {
  surveyId: string;
  vpCount: number;
  verificationPointTimerSeconds: number;
  requireLogin: boolean;
  tapinApiKey: string | null;
  tapinCampaignId: string | null;
}

export function TapInCard({
  surveyId,
  vpCount,
  verificationPointTimerSeconds,
  requireLogin,
  tapinApiKey,
  tapinCampaignId,
}: TapInCardProps) {
  const [enabled, setEnabled] = useState(vpCount > 0);
  const [toggling, setToggling] = useState(false);

  async function handleToggle(checked: boolean) {
    setToggling(true);
    setEnabled(checked);
    try {
      await updateVerificationPointCount(surveyId, checked ? 2 : 0);
    } catch (e) {
      console.error(e);
      setEnabled(!checked);
    } finally {
      setToggling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">TapIn Verification</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="tapin-toggle" className="text-sm text-muted-foreground">
              {enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="tapin-toggle"
              checked={enabled}
              disabled={toggling}
              onCheckedChange={handleToggle}
            />
          </div>
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
      {enabled && (
        <CardContent>
          <TapInSettings
            surveyId={surveyId}
            verificationPointTimerSeconds={verificationPointTimerSeconds}
            requireLogin={requireLogin}
            tapinApiKey={tapinApiKey}
            tapinGroupId={tapinCampaignId}
          />
        </CardContent>
      )}
    </Card>
  );
}
