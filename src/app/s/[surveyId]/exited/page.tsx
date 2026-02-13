import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ExitedPage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <LogOut className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Survey Exited</CardTitle>
          <CardDescription className="text-base">
            You have exited the survey. Your responses have been discarded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={`/s/${surveyId}`}>Start Over</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
