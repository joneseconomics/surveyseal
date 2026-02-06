import { createSurvey } from "@/lib/actions/survey";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewSurveyPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Create Survey</CardTitle>
          <CardDescription>
            Create a new survey with NFC-verified checkpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSurvey} className="space-y-4">
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
