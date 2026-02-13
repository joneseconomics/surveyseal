import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SavedPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Save className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Progress Saved</CardTitle>
          <CardDescription className="text-base">
            Your progress has been saved. You can return to this survey anytime
            using the same link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/s/${surveyId}`}>Return to Survey</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
