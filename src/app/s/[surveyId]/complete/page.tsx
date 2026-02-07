import { db } from "@/lib/db";
import { getSurveySessionId } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, AlertCircle } from "lucide-react";
import { redirect } from "next/navigation";

export default async function SurveyCompletePage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  const sessionId = await getSurveySessionId(surveyId);

  if (!sessionId) redirect(`/s/${surveyId}`);

  const session = await db.surveySession.findUnique({
    where: { id: sessionId },
    include: {
      verificationPoints: true,
    },
  });

  if (!session) redirect(`/s/${surveyId}`);

  const verifiedCount = session.verificationPoints.filter((cp) => cp.verified).length;
  const totalVerificationPoints = session.verificationPoints.length;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Thank You!</CardTitle>
          <CardDescription className="text-base">
            Your survey response has been submitted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session.verificationStatus === "VERIFIED" && (
            <Badge className="gap-1.5 bg-green-100 text-green-800 hover:bg-green-100">
              <Shield className="h-3.5 w-3.5" />
              Human Verified with TapIn
            </Badge>
          )}

          {session.verificationStatus === "PARTIAL" && (
            <Badge className="gap-1.5 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
              <AlertCircle className="h-3.5 w-3.5" />
              Partially Verified ({verifiedCount} of {totalVerificationPoints} verification points)
            </Badge>
          )}

          {session.verificationStatus === "UNVERIFIED" && (
            <Badge variant="secondary" className="gap-1.5">
              Submitted
            </Badge>
          )}

          <p className="text-sm text-muted-foreground">
            {session.verificationStatus === "VERIFIED"
              ? "All three verification points were verified with your TapIn card."
              : session.verificationStatus === "PARTIAL"
                ? "Some verification points were verified with your TapIn card."
                : "Your response was recorded."}
          </p>

          <p className="text-xs text-muted-foreground">
            You can safely close this page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
