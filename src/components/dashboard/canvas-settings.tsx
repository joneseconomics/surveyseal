"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateCanvasSettings } from "@/lib/actions/survey";

interface CanvasSettingsProps {
  surveyId: string;
  canvasBaseUrl: string | null;
  canvasApiToken: string | null;
}

export function CanvasSettings({
  surveyId,
  canvasBaseUrl,
  canvasApiToken,
}: CanvasSettingsProps) {
  const [baseUrl, setBaseUrl] = useState(canvasBaseUrl ?? "https://uc.instructure.com");
  const [token, setToken] = useState(canvasApiToken ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isConfigured = !!canvasApiToken;

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await updateCanvasSettings({
        surveyId,
        canvasBaseUrl: baseUrl,
        canvasApiToken: token,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {isConfigured && (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-600">Connected</Badge>
          <span className="text-sm text-muted-foreground">{canvasBaseUrl}</span>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="canvas-url">Canvas Instance URL</Label>
        <Input
          id="canvas-url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://uc.instructure.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="canvas-token">API Token</Label>
        <Input
          id="canvas-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Enter your Canvas API token"
        />
        <p className="text-xs text-muted-foreground">
          Generate a token in Canvas: Account &rarr; Settings &rarr; New Access Token
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button onClick={handleSave} disabled={saving || !baseUrl || !token}>
        {saving ? "Saving..." : "Save Canvas Settings"}
      </Button>
    </div>
  );
}
