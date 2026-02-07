import { createSurvey } from "@/lib/actions/survey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Scale } from "lucide-react";

export default function NewSurveyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Survey</CardTitle>
          <CardDescription>
            Create a new human-verified survey with physical-tap checkpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSurvey} className="space-y-6">
            {/* Survey type selector */}
            <fieldset className="space-y-3">
              <Label>Survey Type</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value="QUESTIONNAIRE"
                    defaultChecked
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border p-4 transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
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
                    className="peer sr-only"
                  />
                  <div className="rounded-lg border p-4 transition-colors peer-checked:border-primary peer-checked:bg-primary/5">
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

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="e.g. Campus Dining Experience Survey" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe what this survey is about..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="submit">Create Survey</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
