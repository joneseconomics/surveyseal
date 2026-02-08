"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase } from "lucide-react";
import { updateCJResumeConfig } from "@/lib/actions/survey";

interface CJResumeSettingsProps {
  surveyId: string;
  jobTitle: string | null;
  jobUrl: string | null;
}

export function CJResumeSettings({ surveyId, jobTitle: serverJobTitle, jobUrl: serverJobUrl }: CJResumeSettingsProps) {
  const [jobTitle, setJobTitle] = useState(serverJobTitle ?? "");
  const [jobUrl, setJobUrl] = useState(serverJobUrl ?? "");
  const [saving, setSaving] = useState(false);

  const hasChanges =
    jobTitle !== (serverJobTitle ?? "") ||
    jobUrl !== (serverJobUrl ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await updateCJResumeConfig(surveyId, jobTitle, jobUrl);
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
          <Briefcase className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Resume Comparison Setup</CardTitle>
        </div>
        <CardDescription>
          Configure the job position that judges will evaluate resumes for.
          This information is shown to judges in the survey instructions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="jobTitle">Job Title</Label>
          <Input
            id="jobTitle"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
          />
          <p className="text-xs text-muted-foreground">
            The position judges will imagine hiring for.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jobUrl">Job Posting URL</Label>
          <Input
            id="jobUrl"
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            placeholder="https://example.com/careers/senior-engineer"
          />
          <p className="text-xs text-muted-foreground">
            Link to the full job description. Judges can review this before comparing resumes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
