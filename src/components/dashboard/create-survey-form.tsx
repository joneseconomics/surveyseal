"use client";

import { useState } from "react";
import { createSurvey } from "@/lib/actions/survey";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Scale, FileText, Briefcase, LayoutGrid } from "lucide-react";

export function CreateSurveyForm() {
  const [type, setType] = useState<"QUESTIONNAIRE" | "COMPARATIVE_JUDGMENT">("QUESTIONNAIRE");

  return (
    <form action={createSurvey} className="space-y-6">
      {/* Survey type selector */}
      <fieldset className="space-y-3">
        <Label>Survey Type</Label>
        <div className="grid grid-cols-2 gap-3">
          <label className="cursor-pointer">
            <input
              type="radio"
              name="type"
              value="QUESTIONNAIRE"
              checked={type === "QUESTIONNAIRE"}
              onChange={() => setType("QUESTIONNAIRE")}
              className="peer sr-only"
            />
            <div className="flex h-full flex-col rounded-lg border p-4 transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium">Questionnaire</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Traditional survey with multiple choice, Likert scales,
                free text, matrix, and ranking questions.
              </p>
            </div>
          </label>
          <label className="cursor-pointer">
            <input
              type="radio"
              name="type"
              value="COMPARATIVE_JUDGMENT"
              checked={type === "COMPARATIVE_JUDGMENT"}
              onChange={() => setType("COMPARATIVE_JUDGMENT")}
              className="peer sr-only"
            />
            <div className="flex h-full flex-col rounded-lg border p-4 transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium">Comparative Judgment</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Respondents judge pairs of items side by side. Produces
                reliable rankings from pairwise comparisons.
              </p>
            </div>
          </label>
        </div>
      </fieldset>

      {/* CJ Subtype selector */}
      {type === "COMPARATIVE_JUDGMENT" && (
        <fieldset className="space-y-3">
          <Label>Comparison Type</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="cursor-pointer">
              <input type="radio" name="cjSubtype" value="GENERIC" defaultChecked className="peer sr-only" />
              <div className="rounded-lg border p-3 text-center transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
                <LayoutGrid className="mx-auto h-5 w-5 text-primary mb-1" />
                <p className="text-sm font-medium">General</p>
                <p className="text-xs text-muted-foreground">General item comparison</p>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="cjSubtype" value="ASSIGNMENTS" className="peer sr-only" />
              <div className="rounded-lg border p-3 text-center transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
                <FileText className="mx-auto h-5 w-5 text-primary mb-1" />
                <p className="text-sm font-medium">Assignments</p>
                <p className="text-xs text-muted-foreground">Student submissions</p>
              </div>
            </label>
            <label className="cursor-pointer">
              <input type="radio" name="cjSubtype" value="RESUMES" className="peer sr-only" />
              <div className="rounded-lg border p-3 text-center transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
                <Briefcase className="mx-auto h-5 w-5 text-primary mb-1" />
                <p className="text-sm font-medium">Resumes</p>
                <p className="text-xs text-muted-foreground">Candidate comparison</p>
              </div>
            </label>
          </div>
        </fieldset>
      )}

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Campus Dining Experience Survey" required />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit">Create Survey</Button>
      </div>
    </form>
  );
}
