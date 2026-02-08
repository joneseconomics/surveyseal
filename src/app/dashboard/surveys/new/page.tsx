import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateSurveyForm } from "@/components/dashboard/create-survey-form";

export default function NewSurveyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Survey</CardTitle>
          <CardDescription>
            Create a new human-verified survey with physical-tap verification points.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateSurveyForm />
        </CardContent>
      </Card>
    </div>
  );
}
