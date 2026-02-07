"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updateSurveySettings, importTapInCsv } from "@/lib/actions/survey";
import { Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface TapInSettingsProps {
  surveyId: string;
  checkpointTimerSeconds: number;
  requireLogin: boolean;
  tapinApiKey: string | null;
  tapinGroupId: string | null;
}

export function TapInSettings({
  surveyId,
  checkpointTimerSeconds,
  requireLogin,
  tapinApiKey,
  tapinGroupId,
}: TapInSettingsProps) {
  const [csvMessage, setCsvMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleCsvUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    setCsvMessage(null);
    try {
      const text = await file.text();
      const result = await importTapInCsv(surveyId, text);
      setCsvMessage({ text: `Imported ${result.imported} tap${result.imported !== 1 ? "s" : ""} successfully`, error: false });
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e) {
      setCsvMessage({
        text: e instanceof Error ? e.message : "Import failed",
        error: true,
      });
    } finally {
      setCsvLoading(false);
    }
  }

  return (
    <Tabs defaultValue="manual">
      <TabsList>
        <TabsTrigger value="manual">Manual TapIn Verification</TabsTrigger>
        <TabsTrigger value="api">API TapIn Verification</TabsTrigger>
      </TabsList>

      <TabsContent value="manual" className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label>Verification Point Timer (seconds)</Label>
          <form action={updateSurveySettings} className="space-y-4">
            <input type="hidden" name="id" value={surveyId} />
            <input type="hidden" name="requireLogin" value={requireLogin ? "true" : "false"} />
            <input type="hidden" name="tapinApiKey" value={tapinApiKey ?? ""} />
            <input type="hidden" name="tapinCampaignId" value={tapinGroupId ?? ""} />
            <Input
              name="checkpointTimerSeconds"
              type="number"
              min={10}
              max={300}
              defaultValue={checkpointTimerSeconds}
            />
            <p className="text-xs text-muted-foreground">
              Seconds respondents have to tap at each verification point. If the timer expires, the verification point is automatically skipped. Range: 10-300.
            </p>
            <Button type="submit" size="sm">Save Timer</Button>
          </form>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Upload TapIn CSV</Label>
          <p className="text-xs text-muted-foreground">
            Upload a CSV file exported from TapIn with tap records. The CSV must have &ldquo;email&rdquo; and &ldquo;tapped_at&rdquo; (or &ldquo;timestamp&rdquo;) columns. Taps are matched to survey sessions by email and time window.
          </p>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="max-w-xs"
            />
            <Button
              onClick={handleCsvUpload}
              disabled={csvLoading}
              size="sm"
            >
              {csvLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import
            </Button>
          </div>
          {csvMessage && (
            <div className={`flex items-center gap-2 text-sm ${csvMessage.error ? "text-destructive" : "text-green-600"}`}>
              {csvMessage.error ? (
                <AlertCircle className="h-4 w-4 shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 shrink-0" />
              )}
              <span>{csvMessage.text}</span>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="api" className="mt-4">
        <form action={updateSurveySettings} className="space-y-6">
          <input type="hidden" name="id" value={surveyId} />
          <input type="hidden" name="requireLogin" value={requireLogin ? "true" : "false"} />
          <input type="hidden" name="checkpointTimerSeconds" value={checkpointTimerSeconds} />

          <div className="space-y-2">
            <Label htmlFor="tapinApiKey">TapIn API Key</Label>
            <Input
              id="tapinApiKey"
              name="tapinApiKey"
              type="text"
              placeholder="tap_key_..."
              defaultValue={tapinApiKey ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              Used for automatic post-survey verification reconciliation. Get this from your TapIn dashboard.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tapinCampaignId">TapIn Group ID</Label>
            <Input
              id="tapinCampaignId"
              name="tapinCampaignId"
              type="text"
              placeholder="grp_..."
              defaultValue={tapinGroupId ?? ""}
            />
            <p className="text-xs text-muted-foreground">
              The TapIn group to match taps against. Found in your TapIn group settings.
            </p>
          </div>

          <Button type="submit">Save API Settings</Button>
        </form>
      </TabsContent>
    </Tabs>
  );
}
