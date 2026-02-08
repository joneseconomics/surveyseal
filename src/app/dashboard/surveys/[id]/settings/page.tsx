import { auth } from "@/auth";
import { db } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, GraduationCap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TapInCard } from "@/components/dashboard/tapin-card";
import { AuthSettingsCard } from "@/components/dashboard/auth-settings-card";
import { CanvasSettings } from "@/components/dashboard/canvas-settings";
import { CJComparisonSettingsCard } from "@/components/dashboard/cj-comparison-settings-card";
import { CJResumeSettings } from "@/components/dashboard/cj-resume-settings";

export default async function SurveySettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const survey = await db.survey.findUnique({
    where: { id, ownerId: session.user.id },
    select: {
      id: true,
      type: true,
      status: true,
      verificationPointTimerSeconds: true,
      requireLogin: true,
      tapinApiKey: true,
      tapinCampaignId: true,
      canvasBaseUrl: true,
      canvasApiToken: true,
      authProviders: true,
      cjPrompt: true,
      comparisonsPerJudge: true,
      cjSubtype: true,
      cjJobTitle: true,
      cjJobUrl: true,
      questions: { where: { isVerificationPoint: true }, select: { id: true } },
      _count: { select: { cjItems: true } },
    },
  });

  if (!survey) notFound();

  const isCJ = survey.type === "COMPARATIVE_JUDGMENT";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure verification and respondent settings for this survey.
        </p>
      </div>

      <AuthSettingsCard
        surveyId={survey.id}
        requireLogin={survey.requireLogin}
        authProviders={survey.authProviders}
      />

      <TapInCard
        surveyId={survey.id}
        surveyType={survey.type as "QUESTIONNAIRE" | "COMPARATIVE_JUDGMENT"}
        vpCount={survey.questions.length}
        verificationPointTimerSeconds={survey.verificationPointTimerSeconds}
        requireLogin={survey.requireLogin}
        tapinApiKey={survey.tapinApiKey}
        tapinCampaignId={survey.tapinCampaignId}
      />

      {isCJ && (
        <CJComparisonSettingsCard
          surveyId={survey.id}
          cjPrompt={survey.cjPrompt}
          comparisonsPerJudge={survey.comparisonsPerJudge}
          cjItemCount={survey._count.cjItems}
          isDraft={survey.status === "DRAFT"}
        />
      )}

      {isCJ && survey.cjSubtype === "RESUMES" && (
        <CJResumeSettings
          surveyId={survey.id}
          jobTitle={survey.cjJobTitle}
          jobUrl={survey.cjJobUrl}
        />
      )}

      {isCJ && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Canvas LMS Integration</CardTitle>
            </div>
            <CardDescription>
              Connect to Canvas LMS to import student assignment submissions as comparison items.{" "}
              <a
                href="https://community.canvaslms.com/t5/Student-Guide/How-do-I-manage-API-access-tokens-as-a-student/ta-p/273"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                How to generate a Canvas API token
                <ExternalLink className="h-3 w-3" />
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CanvasSettings
              surveyId={survey.id}
              canvasBaseUrl={survey.canvasBaseUrl}
              canvasApiToken={survey.canvasApiToken}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
