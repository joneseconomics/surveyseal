"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ExternalLink, Smartphone } from "lucide-react";
import { TapInSettings } from "@/components/dashboard/tapin-settings";
import { updateVerificationPointCount } from "@/lib/actions/cj-item";

interface TapInCardProps {
  surveyId: string;
  surveyType: "QUESTIONNAIRE" | "COMPARATIVE_JUDGMENT";
  vpCount: number;
  verificationPointTimerSeconds: number;
  requireLogin: boolean;
  tapinApiKey: string | null;
  tapinCampaignId: string | null;
}

export function TapInCard({
  surveyId,
  surveyType,
  vpCount: serverVpCount,
  verificationPointTimerSeconds,
  requireLogin,
  tapinApiKey,
  tapinCampaignId,
}: TapInCardProps) {
  const isCJ = surveyType === "COMPARATIVE_JUDGMENT";
  const [enabled, setEnabled] = useState(serverVpCount > 0);
  const [toggling, setToggling] = useState(false);
  const [vpCountValue, setVpCountValue] = useState(
    serverVpCount > 0 ? serverVpCount.toString() : "2"
  );
  const [savingCount, setSavingCount] = useState(false);

  async function handleToggle(checked: boolean) {
    setToggling(true);
    setEnabled(checked);
    try {
      // CJ surveys always use exactly 2 VPs; questionnaires use the configured count
      const count = checked ? (isCJ ? 2 : parseInt(vpCountValue, 10) || 2) : 0;
      await updateVerificationPointCount(surveyId, count);
    } catch (e) {
      console.error(e);
      setEnabled(!checked);
    } finally {
      setToggling(false);
    }
  }

  async function handleUpdateCount() {
    const count = parseInt(vpCountValue, 10);
    if (isNaN(count) || count < 2 || count > 10) return;
    setSavingCount(true);
    try {
      await updateVerificationPointCount(surveyId, count);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingCount(false);
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
          {isCJ
            ? "Add verification points at the beginning and end of the survey."
            : "Add verification points distributed throughout the survey."}{" "}
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
        <CardContent className="space-y-6">
          {isCJ ? (
            <p className="text-sm text-muted-foreground">
              2 verification points: beginning and end of the survey.
            </p>
          ) : (
            <div className="space-y-2">
              <Label>Number of Verification Points</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={vpCountValue}
                  onChange={(e) => setVpCountValue(e.target.value)}
                  className="w-24"
                  disabled={savingCount}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={
                    savingCount ||
                    !vpCountValue ||
                    parseInt(vpCountValue, 10) === serverVpCount ||
                    parseInt(vpCountValue, 10) < 2 ||
                    parseInt(vpCountValue, 10) > 10
                  }
                  onClick={handleUpdateCount}
                >
                  {savingCount ? "Updating..." : "Update"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Minimum 2 (beginning and end). Additional points are evenly distributed throughout the survey.
              </p>
            </div>
          )}

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
