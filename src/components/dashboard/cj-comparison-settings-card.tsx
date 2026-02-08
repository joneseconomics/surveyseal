"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Scale } from "lucide-react";
import { updateCJSettings } from "@/lib/actions/cj-item";

interface CJComparisonSettingsCardProps {
  surveyId: string;
  cjPrompt: string | null;
  comparisonsPerJudge: number | null;
  cjItemCount: number;
  isDraft: boolean;
}

export function CJComparisonSettingsCard({
  surveyId,
  cjPrompt,
  comparisonsPerJudge,
  cjItemCount,
  isDraft,
}: CJComparisonSettingsCardProps) {
  const [prompt, setPrompt] = useState(cjPrompt ?? "Which of these two do you prefer?");
  const [perJudge, setPerJudge] = useState(comparisonsPerJudge?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateCJSettings({
        surveyId,
        cjPrompt: prompt,
        comparisonsPerJudge: perJudge ? parseInt(perJudge, 10) : null,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Comparison Settings</CardTitle>
        </div>
        <CardDescription>
          Configure the comparison prompt and number of comparisons per judge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cj-prompt">Comparison Prompt</Label>
          <Textarea
            id="cj-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Which of these two items is better? Consider..."
            rows={2}
            disabled={!isDraft}
          />
          <p className="text-xs text-muted-foreground">
            This prompt is shown to judges above each comparison.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cj-per-judge">Comparisons per Judge (optional)</Label>
          <Input
            id="cj-per-judge"
            type="number"
            min={1}
            value={perJudge}
            onChange={(e) => setPerJudge(e.target.value)}
            placeholder={`Default: ${Math.max(cjItemCount - 1, 1)}`}
            disabled={!isDraft}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank for default (number of items - 1).
          </p>
        </div>
        {isDraft && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
